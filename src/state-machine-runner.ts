/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable n/no-unsupported-features/node-builtins */
import {scheduler} from 'timers/promises';
import * as xs from 'xstate';

import {ActorRunner} from './actor-runner.js';
import {
  type ActorRunnerOptions,
  type ActorRunnerOptionsForActor,
  type ActorThenable,
  type IStateMachineActorRunner,
  type OptionsWithoutInspect,
} from './types.js';
import {bind, noop} from './util.js';

/**
 * Helpers for testing state machine behavior
 *
 * @remarks
 * Just a wrapper around {@link ActorRunner}
 * @template T `StateMachine` actor logic
 */
export class StateMachineActorRunner<T extends xs.AnyStateMachine>
  implements IStateMachineActorRunner<T>
{
  constructor(protected readonly runner: ActorRunner<T>) {
    if (!(this.defaultActorLogic instanceof xs.StateMachine)) {
      throw new TypeError(
        'StateMachineActorRunner can only be used with StateMachine instances',
      );
    }
    // State machines _may_ have a default ID
    this.runner.defaultId = this.runner.defaultId ?? this.defaultActorLogic.id;
  }

  /**
   * Runs the machine until a transition from the `source` state to the `target`
   * state occurs.
   *
   * Immediately stops the machine thereafter. Returns a combination of a
   * `Promise` and an {@link xs.Actor} so that events may be sent to the actor.
   *
   * @param source Source state ID
   * @param target Target state ID
   * @param input Machine input
   * @param opts Options
   * @returns An {@link ActorThenable} that resolves when the specified
   *   transition occurs
   * @todo Type narrowing for `source` and `target` once xstate supports it
   *
   * @todo Attempt to reuse {@link waitForTransition}
   */
  @bind()
  public runUntilTransition(
    source: string,
    target: string,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsForActor
    > = {},
  ): ActorThenable<T> {
    const {timeout = this.defaultTimeout} = options;
    let sawTransition = false;

    /**
     * We need the actor ID here so we can match against it in the inspector.
     * However, we don't necessarily have an actor yet, and the inspector may
     * fire _before_ we do (think: initial transition). But we also don't want
     * to miss anything, so we need to generate an ID unless one is otherwise
     * provided.
     */
    const id = this.runner.getActorId(
      input,
      (options as OptionsWithoutInspect<ActorRunnerOptions>).id,
    );

    const transitionInspector = (evt: xs.InspectionEvent) => {
      if (evt.type === '@xstate.microstep') {
        if (evt.actorRef.id === id) {
          if (
            evt._transitions.some(
              (tDef) =>
                tDef.source.id === source &&
                tDef.target?.some((t) => t.id === target),
            )
          ) {
            sawTransition = true;
          }
        }
      }
    };

    const actor =
      input instanceof xs.Actor
        ? this.runner.instrumentActor(input, {
            ...options,
            inspector: transitionInspector,
          } as ActorRunnerOptionsForActor)
        : this.runner.createInstrumentedActor(input, {
            ...options,
            id,
            inspector: transitionInspector,
          } as ActorRunnerOptions);

    // @ts-expect-error internal
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const idMap: Map<string, unknown> = this.runner.defaultActorLogic.idMap;
    if (!idMap.has(source)) {
      throw new Error(`Unknown state ID (source): ${source}`);
    }
    if (!idMap.has(target)) {
      throw new Error(`Unknown state ID (target): ${target}`);
    }

    const p = xs.toPromise(actor);
    const ac = new AbortController();
    actor.start();
    return ActorRunner.createActorThenable(
      actor,
      Promise.race([
        p.then(noop, noop).finally(() => {
          ac.abort();
        }),
        scheduler.wait(timeout, {signal: ac.signal}).then(() => {
          throw new Error(
            `Failed to detect a transition from ${source} to ${target} in ${timeout}ms`,
          );
        }),
      ])
        .then(() => {
          if (!sawTransition) {
            throw new Error(
              `Transition from ${source} to ${target} not detected`,
            );
          }
        })
        .finally(() => {
          actor.stop();
        }),
    );
  }

  /**
   * Runs the machine until a transition from the `source` state to the `target`
   * state occurs.
   *
   * Useful for chaining transitions--but keep in mind that actions are executed
   * synchronously!
   *
   * **Does not stop the machine**. Returns a combination of a `Promise` and an
   * {@link xs.Actor} so that events may be sent to the actor.
   *
   * @param source Source state ID
   * @param target Target state ID
   * @param input Machine input
   * @param opts Options
   * @returns An {@link ActorThenable} that resolves when the specified
   *   transition occurs
   * @todo Type narrowing for `source` and `target` once xstate supports it
   */
  @bind()
  public waitForTransition(
    source: string,
    target: string,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsForActor
    > = {},
  ): ActorThenable<T> {
    const {timeout = this.defaultTimeout} = options;
    let sawTransition = false;

    /**
     * We need the actor ID here so we can match against it in the inspector.
     * However, we don't necessarily have an actor yet, and the inspector may
     * fire _before_ we do (think: initial transition). But we also don't want
     * to miss anything, so we need to generate an ID unless one is otherwise
     * provided.
     */
    const id = this.runner.getActorId(
      input,
      (options as OptionsWithoutInspect<ActorRunnerOptions>).id,
    );

    /**
     * Equivalent to a `InspectedMicrostepEvent`, which is not exported from
     * `xstate`.
     */
    type InspectedTransitionEvent = {
      _transitions: xs.AnyTransitionDefinition[];
      type: '@xstate.microstep';
    } & xs.InspectionEvent;

    /**
     * Type guard for a "microstep" event from the actor
     *
     * @param evt Inspection event
     * @returns `true` if the event is a "microstep" event and is from the actor
     */
    const matchesEventFromActor = (
      evt: xs.InspectionEvent,
    ): evt is InspectedTransitionEvent =>
      evt.type === '@xstate.microstep' && evt.actorRef.id === id;

    /**
     * Checks a {@link InspectedTransitionEvent} for the desired transition.
     *
     * @param fromTransition ID of source transition
     * @param toTransition ID of destination transition
     * @param evt {@link InspectedTransitionEvent} to inspect
     * @returns `true` if the event contains the desired transition
     */
    const eventHasDesiredTransition = (
      fromTransition: string,
      toTransition: string,
      evt: InspectedTransitionEvent,
    ): boolean =>
      evt._transitions.some(
        (tDef) =>
          tDef.source.id === fromTransition &&
          tDef.target?.some((t) => t.id === toTransition),
      );

    /**
     * Inspector which halts the actor once a specific transition is detected
     *
     * @remarks
     * Inspection functions probably shouldn't have side effects, but this one
     * does. Because transitions are not otherwise detectable (you can't just
     * "subscribe" to them) there's really no other place that I'm aware of
     * where we _should_ halt the actor.
     * @param evt Inspection event
     */
    const transitionInspector = (evt: xs.InspectionEvent): void => {
      if (
        matchesEventFromActor(evt) &&
        eventHasDesiredTransition(source, target, evt)
      ) {
        sawTransition = true;
        evt.actorRef.stop(); // see remarks above
      }
    };

    const actor =
      input instanceof xs.Actor
        ? this.runner.instrumentActor(input, {
            ...options,
            inspector: transitionInspector,
          } as ActorRunnerOptionsForActor)
        : this.runner.createInstrumentedActor(input, {
            ...options,
            id,
            inspector: transitionInspector,
          } as ActorRunnerOptions);

    // @ts-expect-error idMap is internal
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const idMap: Map<string, unknown> = this.runner.defaultActorLogic.idMap;
    if (!idMap.has(source)) {
      throw new Error(`Unknown state ID (source): ${source}`);
    }
    if (!idMap.has(target)) {
      throw new Error(`Unknown state ID (target): ${target}`);
    }

    const p = xs.toPromise(actor);

    const ac = new AbortController();
    actor.start();

    return ActorRunner.createActorThenable(
      actor,
      Promise.race([
        p.then(noop, noop).finally(() => {
          ac.abort();
        }),
        scheduler.wait(timeout, {signal: ac.signal}).then(() => {
          throw new Error(
            `Failed to detect a transition from ${source} to ${target} in ${timeout}ms`,
          );
        }),
      ]).then(() => {
        if (!sawTransition) {
          throw new Error(
            `Transition from ${source} to ${target} not detected before actor halted (or timed out)`,
          );
        }
      }),
    );
  }

  /**
   * {@inheritDoc ActorRunner.defaultActorLogic}
   */
  public get defaultActorLogic() {
    return this.runner.defaultActorLogic;
  }

  /**
   * {@inheritDoc ActorRunner.defaultId}
   */
  public get defaultId() {
    return this.runner.defaultId;
  }

  /**
   * {@inheritDoc ActorRunner.defaultInspector}
   */
  public get defaultInspector() {
    return this.runner.defaultInspector;
  }

  /**
   * {@inheritDoc ActorRunner.defaultLogger}
   */
  public get defaultLogger() {
    return this.runner.defaultLogger;
  }

  /**
   * {@inheritDoc ActorRunner.defaultTimeout}
   */
  public get defaultTimeout() {
    return this.runner.defaultTimeout;
  }

  /**
   * {@inheritDoc ActorRunner.runUntilDone}
   */
  public get runUntilDone() {
    return this.runner.runUntilDone;
  }

  /**
   * {@inheritDoc ActorRunner.runUntilEvent}
   */
  public get runUntilEvent() {
    return this.runner.runUntilEvent;
  }

  /**
   * {@inheritDoc ActorRunner.runUntilSnapshot}
   */
  public get runUntilSnapshot() {
    return this.runner.runUntilSnapshot;
  }

  /**
   * {@inheritDoc ActorRunner.runUntilSpawn}
   */
  public get runUntilSpawn() {
    return this.runner.runUntilSpawn;
  }

  /**
   * {@inheritDoc ActorRunner.start}
   */
  public get start() {
    return this.runner.start;
  }

  /**
   * {@inheritDoc ActorRunner.waitForEvent}
   */
  public get waitForEvent() {
    return this.runner.waitForEvent;
  }

  /**
   * {@inheritDoc ActorRunner.waitForSnapshot}
   */
  public get waitForSnapshot() {
    return this.runner.waitForSnapshot;
  }

  /**
   * {@inheritDoc ActorRunner.waitForSpawn}
   */
  public get waitForSpawn() {
    return this.runner.waitForSpawn;
  }
}
