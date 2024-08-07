import * as xs from 'xstate';

import {attachActor, createActorThenable} from './actor.js';
import {applyDefaults} from './defaults.js';
import {
  type InspectedMicrostepEvent,
  isInspectedMicrostepEvent,
} from './guard.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {type ActorThenable, type AuditionOptions} from './types.js';
import {startTimer} from './util.js';

export type CurryTransition =
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
      source: string,
      target: string,
    ) => CurryTransitionP3<Logic>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
      source: string,
    ) => CurryTransitionP2<Logic>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
    ) => CurryTransitionP1<Logic>)
  | (() => CurryTransition);

export type CurryTransitionP1<Logic extends xs.AnyStateMachine> =
  | (() => CurryTransitionP1<Logic>)
  | ((source: string) => CurryTransitionP2<Logic>)
  | ((source: string, target: string) => CurryTransitionP3<Logic>);

export type CurryTransitionP2<Logic extends xs.AnyStateMachine> =
  | (() => CurryTransitionP2<Logic>)
  | ((target: string) => CurryTransitionP3<Logic>);

export type CurryTransitionP3<Logic extends xs.AnyStateMachine> =
  ActorThenable<Logic>;

export type CurryTransitionWith =
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
      source: string,
      target: string,
      options: AuditionOptions,
    ) => CurryTransitionWithP4<Logic>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
      source: string,
      target: string,
    ) => CurryTransitionWithP3<Logic>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
      source: string,
    ) => CurryTransitionWithP2<Logic>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
    ) => CurryTransitionWithP1<Logic>)
  | (() => CurryTransitionWith);

export type CurryTransitionWithP1<Logic extends xs.AnyStateMachine> =
  | ((
      source: string,
      target: string,
      options: AuditionOptions,
    ) => CurryTransitionWithP4<Logic>)
  | (() => CurryTransitionWithP1<Logic>)
  | ((source: string) => CurryTransitionWithP2<Logic>)
  | ((source: string, target: string) => CurryTransitionWithP3<Logic>);

// conflict with eslint-plugin-perfectionist
// prettier-ignore
export type CurryTransitionWithP2<Logic extends xs.AnyStateMachine> =
  | ((
      target: string,
      options: AuditionOptions,
    ) => CurryTransitionWithP4<Logic>)
  | (() => CurryTransitionWithP2<Logic>)
  | ((target: string) => CurryTransitionWithP3<Logic>);

export type CurryTransitionWithP3<Logic extends xs.AnyStateMachine> =
  | (() => CurryTransitionWithP3<Logic>)
  | ((options: AuditionOptions) => CurryTransitionWithP4<Logic>);

export type CurryTransitionWithP4<Logic extends xs.AnyStateMachine> =
  ActorThenable<Logic>;

type TransitionFn = <
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(
  actor: Actor,
  source: string,
  target: string,
  options: AuditionOptions,
) => ActorThenable<Logic>;

/**
 * Runs the machine until a transition from the `source` state to the `target`
 * state occurs.
 *
 * Immediately stops the machine thereafter. Returns a combination of a
 * `Promise` and an {@link xs.Actor} so that events may be sent to the actor.
 *
 * @privateRemarks
 * TODO: Implement type narrowing for `source` and `target` once xstate supports
 * it
 * @template T A state machine
 * @param source Source state ID
 * @param target Target state ID
 * @param actor An existing {@link Actor}
 * @returns An {@link ActorThenable} that resolves when the specified transition
 *   occurs
 */
export function runUntilTransition(): CurryTransition;

export function runUntilTransition<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryTransitionP1<Logic>;

export function runUntilTransition<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor, source: string): CurryTransitionP2<Logic>;

export function runUntilTransition<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor, source: string, target: string): CurryTransitionP3<Logic>;

export function runUntilTransition<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor?: Actor, source?: string, target?: string) {
  return runUntilTransition_(actor, source, target);
}

export function runUntilTransitionWith(): CurryTransitionWith;

export function runUntilTransitionWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryTransitionWithP1<Logic>;

export function runUntilTransitionWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor, source: string): CurryTransitionWithP2<Logic>;

export function runUntilTransitionWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor, source: string, target: string): CurryTransitionWithP3<Logic>;

export function runUntilTransitionWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(
  actor: Actor,
  source: string,
  target: string,
  options: AuditionOptions,
): CurryTransitionWithP4<Logic>;

export function runUntilTransitionWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor?: Actor, source?: string, target?: string, options?: AuditionOptions) {
  return runUntilTransitionWith_(actor, source, target, options);
}

export function waitForTransition(): CurryTransition;

export function waitForTransition<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryTransitionP1<Logic>;

export function waitForTransition<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor, source: string): CurryTransitionP2<Logic>;

export function waitForTransition<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor, source: string, target: string): CurryTransitionP3<Logic>;

export function waitForTransition<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor?: Actor, source?: string, target?: string) {
  return waitForTransition_(actor, source, target);
}

export function waitForTransitionWith(): CurryTransitionWith;

export function waitForTransitionWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryTransitionWithP1<Logic>;

export function waitForTransitionWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor, source: string): CurryTransitionWithP2<Logic>;

export function waitForTransitionWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor, source: string, target: string): CurryTransitionWithP3<Logic>;

export function waitForTransitionWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(
  actor: Actor,
  source: string,
  target: string,
  options: AuditionOptions,
): CurryTransitionWithP4<Logic>;

export function waitForTransitionWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor?: Actor, source?: string, target?: string, options?: AuditionOptions) {
  return waitForTransitionWith_(actor, source, target, options);
}

const createTransitionFn = <T extends TransitionFn>(
  transitionFn: T,
  stop = false,
) => {
  const curryTransition = <
    Logic extends xs.AnyStateMachine,
    Actor extends xs.Actor<Logic>,
  >(
    actor?: Actor,
    source?: string,
    target?: string,
  ) => {
    if (actor) {
      if (source) {
        if (target) {
          return transitionFn(actor, source, target, {stop});
        }
        return ((target?: string) => {
          return target
            ? curryTransition(actor, source, target)
            : curryTransition(actor, source);
        }) as CurryTransitionP2<Logic>;
      }
      return ((source?: string, target?: string) => {
        if (source) {
          return target
            ? curryTransition(actor, source, target)
            : curryTransition(actor, source);
        }
        return source ? curryTransition(actor, source) : curryTransition(actor);
      }) as CurryTransitionP1<Logic>;
    }
    return curryTransition as CurryTransition;
  };

  return curryTransition;
};

const createTransitionWithFn = <T extends TransitionFn>(
  transitionFn: T,
  stop = false,
) => {
  const curryTransitionWith = <
    Logic extends xs.AnyStateMachine,
    Actor extends xs.Actor<Logic>,
  >(
    actor?: Actor,
    source?: string,
    target?: string,
    options?: AuditionOptions,
  ) => {
    if (actor) {
      if (source) {
        if (target) {
          if (options) {
            return transitionFn(actor, source, target, {...options, stop});
          }
          return ((options?: AuditionOptions) => {
            return options
              ? curryTransitionWith(actor, source, target, options)
              : curryTransitionWith(actor, source, target);
          }) as CurryTransitionWithP3<Logic>;
        }
        return ((target?: string, options?: AuditionOptions) => {
          if (target) {
            return options
              ? curryTransitionWith(actor, source, target, options)
              : curryTransitionWith(actor, source, target);
          }
          return curryTransitionWith(actor, source);
        }) as CurryTransitionWithP2<Logic>;
      }
      return ((source?: string, target?: string) => {
        if (source) {
          return target
            ? curryTransitionWith(actor, source, target)
            : curryTransitionWith(actor, source);
        }
        return source
          ? curryTransitionWith(actor, source)
          : curryTransitionWith(actor);
      }) as CurryTransitionWithP1<Logic>;
    }
    return curryTransitionWith as CurryTransitionWith;
  };

  return curryTransitionWith;
};

const untilTransition = <
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(
  actor: Actor,
  source: string,
  target: string,
  options: AuditionOptions = {},
): ActorThenable<Logic> => {
  const {inspector, stop, timeout} = applyDefaults(options);

  const {id} = actor;

  const inspectorObserver = xs.toObserver(inspector);

  const hasTransition = (
    sourceId: string,
    targetId: string,
    {_transitions: transitions}: InspectedMicrostepEvent,
  ) =>
    transitions.some(({source, target}) =>
      Boolean(
        source.id === sourceId && target?.some(({id}) => id === targetId),
      ),
    );

  const {
    abortController: ac,
    promise,
    reject,
    resolve,
  } = createAbortablePromiseKit<void>();

  const didTransition = false;

  const transitionInspector: xs.Observer<xs.InspectionEvent> = {
    complete: () => {
      inspectorObserver.complete?.();
      if (ac.signal.aborted) {
        return;
      }
      if (!didTransition) {
        reject(
          new Error(
            `Transition from ${source} to ${target} not detected before actor completion`,
          ),
        );
      }
    },
    error: (err) => {
      inspectorObserver.error?.(err);
      if (ac.signal.aborted) {
        return;
      }
      reject(err);
    },
    next: (evt: xs.InspectionEvent) => {
      inspectorObserver.next?.(evt);

      if (ac.signal.aborted) {
        return;
      }

      if (
        isInspectedMicrostepEvent(evt) &&
        evt.actorRef.id === id &&
        hasTransition(source, target, evt)
      ) {
        resolve();
        if (stop) {
          actor.stop();
        }
      }
    },
  };

  actor = attachActor(actor, {
    ...options,
    inspector: transitionInspector,
  });

  // @ts-expect-error internal
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const idMap: Map<string, unknown> = actor.logic.idMap;

  if (!idMap.has(source)) {
    throw new ReferenceError(`Unknown state ID (source): ${source}`);
  }
  if (!idMap.has(target)) {
    throw new ReferenceError(`Unknown state ID (target): ${target}`);
  }

  if (timeout !== Infinity) {
    startTimer(ac, timeout, `Actor did not complete in ${timeout}ms`);
  }

  actor.start();
  return createActorThenable(actor, promise);
};

const waitForTransition_ = createTransitionFn(untilTransition, false);

const runUntilTransition_ = createTransitionFn(untilTransition, true);

const runUntilTransitionWith_ = createTransitionWithFn(untilTransition, true);

const waitForTransitionWith_ = createTransitionWithFn(untilTransition, true);
