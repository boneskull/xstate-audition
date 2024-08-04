/* eslint-disable n/no-unsupported-features/node-builtins */
import Debug from 'debug';
import {scheduler} from 'timers/promises';
import * as xs from 'xstate';

import {
  type AbortablePromiseKit,
  type ActorEventTuple,
  type ActorEventTypeTuple,
  type ActorRunnerOptions,
  type ActorRunnerOptionsForActor,
  type ActorRunnerOptionsForActorWithTarget,
  type ActorRunnerOptionsWithTarget,
  type ActorThenable,
  type EventFromEventType,
  type IActorRunner,
  type MaybeOutputFromLogic,
  type MaybeSnapshotFromLogic,
} from './types.js';
import {
  bind,
  DEFAULT_TIMEOUT,
  head,
  isDebugMode as isDebugMode_,
  isString,
  noop,
} from './util.js';

const debug = Debug('xstate-audition:runner');

/**
 * A map of `AbortSignal` to `EventListener` for cleanup.
 */
const abortSignalListeners = new WeakMap<AbortSignal, EventListener>();

/**
 * An implementation of an {@link Audition} which can help test any actor logic.
 */
export class ActorRunner<T extends xs.AnyActorLogic>
  implements IActorRunner<T>
{
  /**
   * Used to generate unique actor IDs when no ID is otherwise provided.
   *
   * Incremented when {@link getActorId} cannot otherwise find an ID.
   *
   * @internal
   */
  public static anonymousActorIndex = 0;

  /**
   * Default actor logic to use
   */
  public readonly defaultActorLogic: T;

  /**
   * Default actor ID to use when creating an actor.
   */
  public defaultId?: string;

  /**
   * Default inspector to use.
   */
  public readonly defaultInspector: (evt: xs.InspectionEvent) => void;

  /**
   * Default logger
   */
  public readonly defaultLogger: (...args: any[]) => void;

  /**
   * Default timeout for those methods which accept a timeout.
   */
  public readonly defaultTimeout: number;

  public readonly isDebugMode: () => boolean;

  /**
   * If `actorLogic` is a state machine, it will use the machine's default ID
   * (if present) as {@link ActorRunner.defaultId} _unless_
   * {@link ActorRunnerOptions.id} is provided in `options`.
   *
   * @param actorLogic Any actor logic
   * @param options Options
   */
  constructor(
    actorLogic: T,
    {
      id: defaultId,
      inspector: defaultInspector = noop,
      isDebugMode = isDebugMode_,
      logger: defaultLogger = noop,
      timeout: defaultTimeout,
    }: ActorRunnerOptions = {},
  ) {
    this.defaultActorLogic = actorLogic;
    this.defaultLogger = defaultLogger;
    this.defaultInspector = defaultInspector;
    this.isDebugMode = isDebugMode;
    defaultTimeout ??= isDebugMode() ? Infinity : DEFAULT_TIMEOUT;
    this.defaultTimeout = defaultTimeout;
    this.defaultId = defaultId;
  }

  /**
   * Factory function for creating a {@link ActorRunner}.
   *
   * @param actorLogic Any actor logic
   * @param options Options
   * @returns A new instance of {@link ActorRunner}
   */
  public static create<T extends xs.AnyActorLogic>(
    actorLogic: T,
    options?: ActorRunnerOptions,
  ): ActorRunner<T> {
    return new ActorRunner(actorLogic, options);
  }

  /**
   * Creates a generic promise that can be aborted via an `AbortController`,
   * packaged in an {@link AbortablePromiseKit}.
   *
   * If a `abortController` is provided and its signal is already aborted, the
   * `promise` property in the return value will reject immediately.
   *
   * @param abortController `AbortController`, if any
   * @returns An {@link AbortablePromiseKit}
   */
  public static createAbortablePromiseKit<T>(
    abortController = new AbortController(),
  ): AbortablePromiseKit<T> {
    /**
     * Tracks the listener for the `abort` event on the `AbortSignal`.
     *
     * @param signal AbortSignal
     * @param listener Listener for `abort` event
     */
    const addAbortListener = (
      signal: AbortSignal,
      listener: EventListener,
    ): void => {
      signal.addEventListener('abort', listener);
      abortSignalListeners.set(signal, listener);
    };

    /**
     * Looks for the listener for the `abort` event on the `AbortSignal` and
     * removes it.
     *
     * @param signal AbortSignal
     */
    const removeAbortListener = (signal: AbortSignal): void => {
      const listener = abortSignalListeners.get(signal);
      if (listener) {
        signal.removeEventListener('abort', listener);
        abortSignalListeners.delete(signal);
      }
    };

    const {signal} = abortController;

    let resolve!: (value: PromiseLike<T> | T) => void;
    let reject!: (reason: unknown) => void;

    const promise = new Promise<T>((resolve_, reject_): void => {
      resolve = resolve_;
      reject = reject_;
    }).finally((): void => {
      removeAbortListener(signal);
      abortController.abort();
    });

    if (signal.aborted) {
      reject(signal.reason);
    } else {
      // no point in adding a listener if it's already aborted
      addAbortListener(signal, (): void => {
        reject(signal.reason);
      });
    }

    return {abortController, promise, reject, resolve};
  }

  /**
   * Creates an {@link ActorThenable} from an {@link xs.Actor} and a
   * {@link Promise}.
   *
   * @param actor An `Actor` or an `ActorThenable`
   * @param promise Any `Promise`
   * @returns An `Actor` which is also a thenable
   * @internal
   */
  public static createActorThenable<T extends xs.AnyActorLogic, Out = void>(
    actor: ActorThenable<T, Out> | xs.Actor<T>,
    promise: Promise<Out>,
  ): ActorThenable<T, Out> {
    const isThenable = (
      actor: ActorThenable<T, Out> | xs.Actor<T>,
    ): actor is ActorThenable<T, Out> =>
      'then' in actor && 'catch' in actor && 'finally' in actor;

    // there are myriad ways to do this, and here is one.
    return new Proxy(actor, {
      get: (target, prop, receiver) => {
        switch (prop) {
          case 'catch':
          case 'finally':
          case 'then':
            return isThenable(target)
              ? target[prop]
              : // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                (...args: any[]) => promise[prop].call(promise, ...args);
          default:
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return Reflect.get(target, prop, receiver);
        }
      },
    }) as ActorThenable<T, Out>;
  }

  /**
   * Creates a new `Actor` from the actor logic and the provided input. Assigns
   * default or provided `id`, logger and inspector.
   *
   * @param input Input for actor logic
   * @param options Options for {@link xs.createActor}, mostly
   * @returns New actor (not started)
   * @internal
   */
  public createInstrumentedActor(
    input: xs.InputFrom<T>,
    options: ActorRunnerOptions,
  ): xs.Actor<T> {
    const {
      id = this.defaultId,
      inspector: inspect = this.defaultInspector,
      logger = this.defaultLogger,
    } = options;
    return xs.createActor(this.defaultActorLogic, {
      id,
      input,
      inspect,
      logger,
    });
  }

  /**
   * Gets an actor ID for a new actor or from an existing actor.
   *
   * If one is otherwise unavailable, a unique ID will be generated matching
   * `^__ActorHelpers-\d+__$`.
   *
   * @param input Input for {@link defaultActorLogic} or an existing
   *   {@link xs.Actor}
   * @param id Default ID, if any
   * @returns A unique ID
   * @internal
   */
  public getActorId<T extends xs.AnyActorLogic>(
    input: xs.Actor<T> | xs.InputFrom<T>,
    id = this.defaultId,
  ): string {
    if (input instanceof xs.Actor) {
      id = input.id;
    }
    return id || `__ActorHelpers-${ActorRunner.anonymousActorIndex++}__`;
  }

  /**
   * Sets up an existing `Actor` with a logger and inspector.
   *
   * @param actor Actor
   * @param options Options for instrumentation
   * @returns Instrumented actor
   * @internal
   */
  public instrumentActor(
    actor: xs.Actor<T>,
    options: ActorRunnerOptionsForActor,
  ): xs.Actor<T> {
    const {
      inspector: inspect = this.defaultInspector,
      logger = this.defaultLogger,
    } = options;
    actor.system.inspect(inspect);
    // @ts-expect-error private
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    actor.logger = actor._actorScope.logger = logger;
    return actor;
  }

  /**
   * Runs an actor to completion (or timeout) and fulfills with its output.
   *
   * @param input Actor input
   * @param options Options
   * @returns `Promise` fulfilling with the actor output
   */
  public runUntilDone(
    this: ActorRunner<T>,
    input: xs.InputFrom<T>,
    options?: ActorRunnerOptions,
  ): ActorThenable<T, MaybeOutputFromLogic<T>>;

  /**
   * Runs an actor to completion (or timeout) and fulfills with its output.
   *
   * @param actor Actor
   * @param options Options
   * @returns `Promise` fulfilling with the actor output
   */
  public runUntilDone(
    this: ActorRunner<T>,
    actor: xs.Actor<T>,
    options?: ActorRunnerOptionsForActor,
  ): ActorThenable<T, MaybeOutputFromLogic<T>>;

  /**
   * Runs an actor to completion (or timeout) and fulfills with its output.
   *
   * @param input Input for {@link defaultActorLogic} or an existing
   *   {@link xs.Actor}
   * @param options Options
   * @returns `Promise` fulfilling with the actor output
   */
  @bind()
  public runUntilDone(
    this: ActorRunner<T>,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsForActor = {},
  ): ActorThenable<T, MaybeOutputFromLogic<T>> {
    const {timeout = this.defaultTimeout} = options;

    const actor: xs.Actor<T> =
      input instanceof xs.Actor
        ? this.instrumentActor(input, options as ActorRunnerOptionsForActor)
        : this.createInstrumentedActor(input, options as ActorRunnerOptions);

    // order is important: create promise, then start.
    const {
      abortController: ac,
      promise,
      reject,
      resolve,
    } = ActorRunner.createAbortablePromiseKit<MaybeOutputFromLogic<T>>();
    if (timeout !== Infinity) {
      this.startTimer(ac, timeout, `Actor did not complete in ${timeout}ms`);
    }
    actor.subscribe({
      complete: () => {
        const snapshot = actor.getSnapshot() as MaybeSnapshotFromLogic<T>;
        if (snapshot && snapshot.status === 'done') {
          resolve(snapshot.output as MaybeOutputFromLogic<T>);
        }
        resolve(undefined as MaybeOutputFromLogic<T>);
      },
      error: (err) => {
        reject(err);
      },
    });
    actor.start();

    return ActorRunner.createActorThenable(actor, promise);
  }

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * Immediately stops the actor thereafter.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param input Actor input
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   */
  public runUntilEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    input: xs.InputFrom<T>,
    options?: ActorRunnerOptionsWithTarget,
  ): ActorThenable<T, ActorEventTuple<T, EventTypes>>;

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * Immediately stops the actor thereafter.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param actor Actor
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   * @todo See if we cannot distinguish between emitted events, sent events,
   *   etc., at runtime. This would prevent the need to blindly subscribe and
   *   use the inspector at the same time.
   */
  public runUntilEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    actor: xs.Actor<T>,
    options?: ActorRunnerOptionsForActorWithTarget,
  ): ActorThenable<T, ActorEventTuple<T, EventTypes>>;

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param input Actor input
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   */
  public runUntilEvent<
    const EventTypes extends ActorEventTypeTuple<xs.AnyActorLogic>,
  >(
    events: EventTypes,
    input: xs.InputFrom<T>,
    options?: ActorRunnerOptionsWithTarget,
  ): ActorThenable<T, ActorEventTuple<xs.AnyActorLogic, EventTypes>>;

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param actor Actor
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   * @todo See if we cannot distinguish between emitted events, sent events,
   *   etc., at runtime. This would prevent the need to blindly subscribe and
   *   use the inspector at the same time.
   */
  public runUntilEvent<
    const EventTypes extends ActorEventTypeTuple<xs.AnyActorLogic>,
  >(
    events: EventTypes,
    actor: xs.Actor<T>,
    options?: ActorRunnerOptionsForActorWithTarget,
  ): ActorThenable<T, ActorEventTuple<xs.AnyActorLogic, EventTypes>>;

  /**
   * Runs an actor (or starts a new one) until it emits or sends one or more
   * events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * Immediately stops the actor thereafter.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param input Input for {@link defaultActorLogic} or an existing
   *   {@link xs.Actor}
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   */
  @bind()
  public runUntilEvent<
    const EventTypes extends
      | ActorEventTypeTuple<T>
      | ActorEventTypeTuple<xs.AnyActorLogic>,
  >(
    events: EventTypes,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsForActor = {},
  ): ActorThenable<
    T,
    | ActorEventTuple<T, EventTypes>
    | ActorEventTuple<xs.AnyActorLogic, EventTypes>
  > {
    const actor =
      input instanceof xs.Actor
        ? this.instrumentActor(
            input,
            options as ActorRunnerOptionsForActorWithTarget,
          )
        : this.createInstrumentedActor(
            input,
            options as ActorRunnerOptionsWithTarget,
          );

    const pActor = this.waitForEvent(events, actor, options);
    // XXX: afaict we can only have one .finally attached to `pActor`.
    // there's already one there, so this is what I came up with.
    // pActor.then(
    //   () => {
    //     actor.stop();
    //   },
    //   () => {
    //     actor.stop();
    //   },
    // );

    void Promise.resolve(pActor).finally(() => {
      actor.stop();
    });
    return pActor;
  }

  /**
   * Runs a actor until the snapshot predicate returns `true`.
   *
   * Immediately stops the actor thereafter.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Actor input
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  public runUntilSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.InputFrom<T>,
    options?: ActorRunnerOptions,
  ): ActorThenable<T, xs.SnapshotFrom<T>>;

  /**
   * Runs a actor until the snapshot predicate returns `true`.
   *
   * Immediately stops the actor thereafter.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Actor
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  public runUntilSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    actor: xs.Actor<T>,
    options?: ActorRunnerOptionsForActor,
  ): ActorThenable<T, xs.SnapshotFrom<T>>;

  /**
   * Runs an actor until the snapshot predicate returns `true`.
   *
   * Immediately stops the actor thereafter.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Input for {@link defaultActorLogic} or an existing
   *   {@link xs.Actor}
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  @bind()
  public runUntilSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsForActor = {},
  ): ActorThenable<T, xs.SnapshotFrom<T>> {
    const {timeout = this.defaultTimeout} = options;

    const actor =
      input instanceof xs.Actor
        ? this.instrumentActor(input, options as ActorRunnerOptionsForActor)
        : this.createInstrumentedActor(input, options as ActorRunnerOptions);

    actor.start();

    return ActorRunner.createActorThenable(
      actor,

      xs
        .waitFor(actor, predicate, {timeout})
        .catch((err) => {
          if (err instanceof Error) {
            if (err.message.startsWith('Timeout of')) {
              throw new Error(
                `Snapshot did not match predicate in ${timeout}ms`,
              );
            } else if (
              err.message.startsWith(
                'Actor terminated without satisfying predicate',
              )
            ) {
              throw new Error(`Actor stopped without satisfying predicate`);
            }
          }
          throw err;
        })
        .finally(() => {
          actor.stop();
        }),
    );
  }

  /**
   * Waits for an actor to be spawned.
   *
   * "Actor" here refers to _some other actor_--not the actor provided via
   * `input` nor created from the input object (this is the "root" actor).
   *
   * Immediately stops the root actor thereafter.
   *
   * @param actorId A string or RegExp to match against the actor ID
   * @param input Actor input or an {@link xs.Actor}
   * @param options Options
   * @returns The `ActorRef` of the spawned actor
   */
  @bind()
  public runUntilSpawn(
    actorId: RegExp | string,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsForActor = {},
  ): ActorThenable<T, xs.AnyActorRef> {
    const actor = this.start(input, options);
    const pActor = this.waitForSpawn(actorId, actor, options);
    void pActor.finally(() => {
      actor.stop();
    });
    return pActor;
  }

  /**
   * Starts the actor and returns the {@link xs.Actor} object.
   *
   * @param input Actor input
   * @param options Options
   * @returns The {@link xs.Actor} itself
   */
  public start(
    input: xs.InputFrom<T>,
    options?: Omit<ActorRunnerOptions, 'timeout'>,
  ): xs.Actor<T>;

  public start(
    actor: xs.Actor<T>,
    options?: Omit<ActorRunnerOptionsForActor, 'timeout'>,
  ): xs.Actor<T>;

  @bind()
  public start(
    input: xs.Actor<T> | xs.InputFrom<T>,
    options: Omit<
      ActorRunnerOptions | ActorRunnerOptionsForActor,
      'timeout'
    > = {},
  ): xs.Actor<T> {
    const actor =
      input instanceof xs.Actor
        ? this.instrumentActor(input, options as ActorRunnerOptionsForActor)
        : this.createInstrumentedActor(input, options as ActorRunnerOptions);
    return actor.start();
  }

  /**
   * Starts a timer that will abort if the timeout has expired.
   *
   * If `timeout` is `Infinity`, no timer will be created.
   *
   * @param ac AbortController
   * @param timeout Timeout in ms
   * @param message Timeout message
   */
  public startTimer(
    ac: AbortController,
    timeout: number,
    message?: string,
  ): void {
    if (timeout === Infinity) {
      return;
    }
    scheduler.wait(timeout, {signal: ac.signal}).then(() => {
      ac.abort(new Error(message || `Timeout of ${timeout}ms exceeded`));
    }, noop);
    debug('Created timeout timer for %dms', timeout);
  }

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param input Actor input
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   */
  public waitForEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    input: xs.InputFrom<T>,
    options?: ActorRunnerOptionsWithTarget,
  ): ActorThenable<T, ActorEventTuple<T, EventTypes>>;

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param actor Actor
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   * @todo See if we cannot distinguish between emitted events, sent events,
   *   etc., at runtime. This would prevent the need to blindly subscribe and
   *   use the inspector at the same time.
   */
  public waitForEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    actor: xs.Actor<T>,
    options?: ActorRunnerOptionsForActorWithTarget,
  ): ActorThenable<T, ActorEventTuple<T, EventTypes>>;

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param input Actor input
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   */
  public waitForEvent<
    const EventTypes extends ActorEventTypeTuple<xs.AnyActorLogic>,
  >(
    events: EventTypes,
    input: xs.InputFrom<T>,
    options?: ActorRunnerOptionsWithTarget,
  ): ActorThenable<T, ActorEventTuple<xs.AnyActorLogic, EventTypes>>;

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param actor Actor
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   * @todo See if we cannot distinguish between emitted events, sent events,
   *   etc., at runtime. This would prevent the need to blindly subscribe and
   *   use the inspector at the same time.
   */
  public waitForEvent<
    const EventTypes extends ActorEventTypeTuple<xs.AnyActorLogic>,
  >(
    events: EventTypes,
    actor: xs.Actor<T>,
    options?: ActorRunnerOptionsForActorWithTarget,
  ): ActorThenable<T, ActorEventTuple<xs.AnyActorLogic, EventTypes>>;

  /**
   * Runs an actor (or starts a new one) until it emits or sends one or more
   * events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param input Input for {@link defaultActorLogic} or an existing
   *   {@link xs.Actor}
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   */
  @bind()
  public waitForEvent<
    const EventTypes extends
      | ActorEventTypeTuple<T>
      | ActorEventTypeTuple<xs.AnyActorLogic>,
  >(
    events: EventTypes,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options:
      | ActorRunnerOptionsForActorWithTarget
      | ActorRunnerOptionsWithTarget = {},
  ) {
    const expectedEventQueue = [...events];
    if (!expectedEventQueue.length) {
      throw new TypeError('Expected one or more event types');
    }

    const {target: targetId, timeout = this.defaultTimeout} = options;
    const id = this.getActorId(input, (options as ActorRunnerOptions).id);

    // targetId may be an object with an `id` field (maybe an `ActorRef`) or a string or undefined.
    // normalize it to a string or undefined.
    const target =
      targetId &&
      (isString(targetId)
        ? targetId
        : typeof targetId === 'object'
          ? targetId.id
          : undefined);

    /**
     * If we have a `target` actor ID, this asserts a given `ActorRef`'s `id`
     * matches the target.
     */
    const matchesTarget: (actorRef?: xs.AnyActorRef) => boolean = target
      ? (actorRef) => actorRef?.id === target
      : () => false;

    /**
     * Type guard for an `@xstate.event` inspection event originating from the
     * source actor.
     *
     * @param evt Any inspection event
     * @param type An expected event type
     * @returns `true` if the event matches the expected type and was
     *   sent/emitted from the actor with matching `id`
     */
    const matchesEventFromActor = (
      evt: xs.InspectionEvent,
      type: EventTypes[number],
    ): evt is xs.InspectedEventEvent =>
      evt.type === '@xstate.event' &&
      type === evt.event.type &&
      evt.sourceRef?.id === id;

    const actor =
      input instanceof xs.Actor
        ? this.instrumentActor(input, options as ActorRunnerOptionsForActor)
        : this.createInstrumentedActor(input, options as ActorRunnerOptions);

    const {
      abortController: ac,
      promise,
      reject,
      resolve,
    } = ActorRunner.createAbortablePromiseKit<ActorEventTuple<T, EventTypes>>();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const emitted: ActorEventTuple<T, EventTypes> = [] as any;

    actor.system.inspect({
      complete: () => {
        if (ac.signal.aborted) {
          return;
        }
        if (expectedEventQueue.length) {
          reject(
            new Error(
              `Event(s) not sent nor emitted before actor completed: ${expectedEventQueue.join(', ')}`,
            ),
          );
        }
      },
      error: reject,
      next: (evt: xs.InspectionEvent) => {
        if (ac.signal.aborted) {
          return;
        }
        if (expectedEventQueue.length) {
          const type = head(expectedEventQueue);
          if (matchesEventFromActor(evt, type)) {
            // in this type of event, the `actorRef` is a target actor and the `sourceRef` is a source
            if (!matchesTarget(evt.actorRef)) {
              return;
            }
            emitted.push(evt.event as EventFromEventType<T, typeof type>);
            expectedEventQueue.shift();
            if (!expectedEventQueue.length) {
              resolve(emitted);
            }
            // XXX why am I doing this
            subscription?.unsubscribe();
          }
        }
      },
    });

    let subscription: undefined | xs.Subscription;

    // if there's a target, it means we are looking for an event sent from
    // the root actor somewhere else.  this means we won't be looking
    // for an emitted event (which this block handles)
    if (!target) {
      // subscription fields emitted events
      const subscribe = (type: EventTypes[number]) => {
        subscription = actor.on(type, (event) => {
          if (ac.signal.aborted) {
            return;
          }
          subscription?.unsubscribe();
          emitted.push(event as EventFromEventType<T, EventTypes[number]>);
          expectedEventQueue.shift();
          if (!expectedEventQueue.length) {
            actor.stop();
            resolve(emitted);
          } else {
            subscription = subscribe(head(expectedEventQueue));
          }
        });
        return subscription;
      };

      subscription = subscribe(head(expectedEventQueue));
    }

    actor.start();

    this.startTimer(
      ac,
      timeout,
      `Event(s) not sent nor emitted in ${timeout}ms: ${expectedEventQueue.join(
        ', ',
      )}`,
    );

    return ActorRunner.createActorThenable(
      actor,
      promise.finally(() => {
        subscription?.unsubscribe();
      }),
    );
  }

  /**
   * Runs a actor until the snapshot predicate returns `true`.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Actor input
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  public waitForSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.InputFrom<T>,
    options?: ActorRunnerOptions,
  ): ActorThenable<T, xs.SnapshotFrom<T>>;

  /**
   * Runs a actor until the snapshot predicate returns `true`.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Actor
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  public waitForSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    actor: xs.Actor<T>,
    options?: ActorRunnerOptionsForActor,
  ): ActorThenable<T, xs.SnapshotFrom<T>>;

  /**
   * Runs a new or existing actor until the snapshot predicate returns `true`.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Input for {@link defaultActorLogic} or an existing
   *   {@link xs.Actor}
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  @bind()
  public waitForSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsForActor = {},
  ): ActorThenable<T, xs.SnapshotFrom<T>> {
    const {timeout = this.defaultTimeout} = options;

    const actor =
      input instanceof xs.Actor
        ? this.instrumentActor(input, options as ActorRunnerOptionsForActor)
        : this.createInstrumentedActor(input, options as ActorRunnerOptions);

    actor.start();

    return ActorRunner.createActorThenable(
      actor,
      xs.waitFor(actor, predicate, {timeout}).catch((err) => {
        if (err instanceof Error) {
          // TODO: press xstate for error codes
          if (err.message.startsWith('Timeout of')) {
            throw new Error(`Snapshot did not match predicate in ${timeout}ms`);
          } else if (
            err.message.startsWith(
              'Actor terminated without satisfying predicate',
            )
          ) {
            throw new Error(`Actor terminated before satisfying predicate`);
          }
        }
        throw err;
      }),
    );
  }

  /**
   * A function that waits for an actor to be spawned.
   *
   * Does **not** stop the root actor.
   *
   * @param actorId A string or RegExp to match against the actor ID
   * @param input Actor input or an {@link xs.Actor}
   * @param options Options
   * @returns The `ActorRef` of the spawned actor
   * @todo Add option for "emit only"
   */
  @bind()
  public waitForSpawn(
    actorId: RegExp | string,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsForActor = {},
  ): ActorThenable<T, xs.AnyActorRef> {
    const predicate = isString(actorId)
      ? (id: string) => id === actorId
      : (id: string) => actorId.test(id);

    const {timeout = this.defaultTimeout} = options;
    const actor =
      input instanceof xs.Actor
        ? this.instrumentActor(input, options as ActorRunnerOptionsForActor)
        : this.createInstrumentedActor(input, options as ActorRunnerOptions);

    const {
      abortController: ac,
      promise,
      reject,
      resolve,
    } = ActorRunner.createAbortablePromiseKit<xs.AnyActorRef>();

    actor.system.inspect({
      complete: () => {
        reject(
          new Error(
            `Actor terminated before detecting spawned actor matching ${actorId}`,
          ),
        );
      },
      error: (err) => {
        reject(err);
      },
      next: (evt) => {
        if (predicate(evt.actorRef.id)) {
          resolve(evt.actorRef);
        }
      },
    });

    actor.start();

    this.startTimer(
      ac,
      timeout,
      `Failed to detect an spawned actor matching ${actorId} in ${timeout}ms`,
    );

    return ActorRunner.createActorThenable(actor, promise);
  }
}
