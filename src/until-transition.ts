import * as xs from 'xstate';

import {createPatcher} from './actor.js';
import {applyDefaults} from './defaults.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {startTimer} from './timer.js';
import {
  type AnyStateMachineActor,
  type AuditionOptions,
  type InternalAuditionOptions,
} from './types.js';
import {
  type InspectedMicrostepEvent,
  isActorRef,
  isInspectedMicrostepEvent,
} from './util.js';

/**
 * The type of {@link runUntilTransition} or {@link waitForTransition}, and the
 * type when those functions are called without arguments.
 */
export type CurryTransition = (() => CurryTransition) &
  (<TActor extends AnyStateMachineActor>(
    actor: TActor,
    source: string,
    target: string,
  ) => CurryTransitionP3) &
  (<TActor extends AnyStateMachineActor>(
    actor: TActor,
    source: string,
  ) => CurryTransitionP2<TActor>) &
  (<TActor extends AnyStateMachineActor>(
    actor: TActor,
  ) => CurryTransitionP1<TActor>);

export type CurryTransitionP1<TActor extends AnyStateMachineActor> =
  (() => CurryTransitionP1<TActor>) &
    ((source: string) => CurryTransitionP2<TActor>) &
    ((source: string, target: string) => CurryTransitionP3);

export type CurryTransitionP2<TActor extends AnyStateMachineActor> =
  (() => CurryTransitionP2<TActor>) & ((target: string) => CurryTransitionP3);

/**
 * The final return type of {@link runUntilTransition}, {@link waitForTransition},
 * {@link runUntilTransitionWith} and {@link waitForTransitionWith}.
 *
 * Can be returned by:
 *
 * - {@link CurryTransition}
 * - {@link CurryTransitionP1}
 * - {@link CurryTransitionP2}
 * - {@link CurryTransitionWith}
 * - {@link CurryTransitionWithP1}
 * - {@link CurryTransitionWithP2}
 * - {@link CurryTransitionWithP3}
 */
export type CurryTransitionP3 = Promise<void>;

export type CurryTransitionWith = (() => CurryTransitionWith) &
  (<TActor extends AnyStateMachineActor>(
    actor: TActor,
    options: AuditionOptions,
    source: string,
    target: string,
  ) => CurryTransitionWithP4) &
  (<TActor extends AnyStateMachineActor>(
    actor: TActor,
    options: AuditionOptions,
    source: string,
  ) => CurryTransitionWithP3<TActor>) &
  (<TActor extends AnyStateMachineActor>(
    actor: TActor,
    options: AuditionOptions,
  ) => CurryTransitionWithP2<TActor>) &
  (<TActor extends AnyStateMachineActor>(
    actor: TActor,
  ) => CurryTransitionWithP1<TActor>);

// conflict with eslint-plugin-perfectionist
// prettier-ignore
export type CurryTransitionWithP1<TActor extends AnyStateMachineActor> =
  & ((
      options: AuditionOptions,
      source: string,
      target: string,
    ) => CurryTransitionWithP4)
  & (() => CurryTransitionWithP1<TActor>)
  & ((options: AuditionOptions) => CurryTransitionWithP2<TActor>)
  & ((options: AuditionOptions, source: string) => CurryTransitionWithP3<TActor>);

// conflict with eslint-plugin-perfectionist
// prettier-ignore
export type CurryTransitionWithP2<TActor extends AnyStateMachineActor> =
  & ((
      source: string,
      target: string,
    ) => CurryTransitionWithP4)
  & (() => CurryTransitionWithP2<TActor>)
  & ((source: string) => CurryTransitionWithP3<TActor>);

export type CurryTransitionWithP3<TActor extends AnyStateMachineActor> =
  (() => CurryTransitionWithP3<TActor>) &
    ((target: string) => CurryTransitionWithP4);

/**
 * Final result of {@link runUntilTransitionWith} and
 * {@link waitForTransitionWith}.
 */
export type CurryTransitionWithP4 = Promise<void>;

/**
 * Runs the machine until a transition from the `source` state to the `target`
 * state occurs.
 *
 * @privateRemarks
 * TODO: Implement type narrowing for `source` and `target` once xstate supports
 * it
 *
 * TODO: Maybe resolve w/ a snapshot
 * @template TActor A state machine Actor type
 * @param actor An existing {@link xs.Actor}
 * @param source Source state ID
 * @param target Target state ID
 * @returns A `Promise` that resolves when the transition occurs
 */
export function runUntilTransition<TActor extends AnyStateMachineActor>(
  actor: TActor,
  source: string,
  target: string,
): CurryTransitionP3;

/**
 * @param actor
 * @param source
 */
export function runUntilTransition<TActor extends AnyStateMachineActor>(
  actor: TActor,
  source: string,
): CurryTransitionP2<TActor>;

/**
 * @param actor
 */
export function runUntilTransition<TActor extends AnyStateMachineActor>(
  actor: TActor,
): CurryTransitionP1<TActor>;

/**
 * Returns itself
 */
export function runUntilTransition(): CurryTransition;

/**
 * @param actor
 * @param source
 * @param target
 * @returns
 */
export function runUntilTransition<TActor extends AnyStateMachineActor>(
  actor?: TActor,
  source?: string,
  target?: string,
) {
  return runUntilTransition_(actor, source, target);
}

/**
 * @param actor
 * @param options
 * @param source
 * @param target
 */
export function runUntilTransitionWith<TActor extends AnyStateMachineActor>(
  actor: TActor,
  options: AuditionOptions,
  source: string,
  target: string,
): CurryTransitionWithP4;

/**
 * @param actor
 * @param options
 * @param source
 */
export function runUntilTransitionWith<TActor extends AnyStateMachineActor>(
  actor: TActor,
  options: AuditionOptions,
  source: string,
): CurryTransitionWithP3<TActor>;

/**
 * @param actor
 * @param options
 */
export function runUntilTransitionWith<TActor extends AnyStateMachineActor>(
  actor: TActor,
  options: AuditionOptions,
): CurryTransitionWithP2<TActor>;

/**
 * @param actor
 */
export function runUntilTransitionWith<TActor extends AnyStateMachineActor>(
  actor: TActor,
): CurryTransitionWithP1<TActor>;

export function runUntilTransitionWith(): CurryTransitionWith;

/**
 * @param actor
 * @param options
 * @param source
 * @param target
 * @returns
 */
export function runUntilTransitionWith<TActor extends AnyStateMachineActor>(
  actor?: TActor,
  options?: AuditionOptions,
  source?: string,
  target?: string,
) {
  return runUntilTransitionWith_(actor, options, source, target);
}

export function waitForTransition(): CurryTransition;

export function waitForTransition<TActor extends AnyStateMachineActor>(
  actor: TActor,
): CurryTransitionP1<TActor>;

export function waitForTransition<TActor extends AnyStateMachineActor>(
  actor: TActor,
  source: string,
): CurryTransitionP2<TActor>;

export function waitForTransition<TActor extends AnyStateMachineActor>(
  actor: TActor,
  source: string,
  target: string,
): CurryTransitionP3;

export function waitForTransition<TActor extends AnyStateMachineActor>(
  actor?: TActor,
  source?: string,
  target?: string,
) {
  return waitForTransition_(actor, source, target);
}

export function waitForTransitionWith(): CurryTransitionWith;

export function waitForTransitionWith<TActor extends AnyStateMachineActor>(
  actor: TActor,
): CurryTransitionWithP1<TActor>;

export function waitForTransitionWith<TActor extends AnyStateMachineActor>(
  actor: TActor,
  options: AuditionOptions,
): CurryTransitionWithP2<TActor>;

export function waitForTransitionWith<TActor extends AnyStateMachineActor>(
  actor: TActor,
  options: AuditionOptions,
  source: string,
): CurryTransitionWithP3<TActor>;

export function waitForTransitionWith<TActor extends AnyStateMachineActor>(
  actor: TActor,
  options: AuditionOptions,
  source: string,
  target: string,
): CurryTransitionWithP4;

export function waitForTransitionWith<TActor extends AnyStateMachineActor>(
  actor?: TActor,
  options?: AuditionOptions,
  source?: string,
  target?: string,
) {
  return waitForTransitionWith_(actor, options, source, target);
}

/**
 * Checks if the state machine has a state with the given `stateId`.
 *
 * @param actor Any state machine actor
 * @param stateId A stateId
 * @returns `true` if the state machine has a matching state with id `stateId`
 * @internal
 */
const hasStateKey = <TActor extends AnyStateMachineActor>(
  actor: TActor,
  stateId: string,
): boolean => {
  // @ts-expect-error internal
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const idMap: Map<string, unknown> = actor.logic.idMap;

  return idMap.has(stateId);
};

const createTransitionFn = (stop = false) => {
  const curryTransition = <TActor extends AnyStateMachineActor>(
    actor?: TActor,
    source?: string,
    target?: string,
  ) => {
    if (actor) {
      if (source) {
        if (target) {
          return untilTransition(actor, {stop}, source, target);
        }

        return ((target?: string) => {
          return target
            ? curryTransition(actor, source, target)
            : curryTransition(actor, source);
        }) as CurryTransitionP2<TActor>;
      }

      return ((source?: string, target?: string) => {
        if (source) {
          return target
            ? curryTransition(actor, source, target)
            : curryTransition(actor, source);
        }

        return source ? curryTransition(actor, source) : curryTransition(actor);
      }) as CurryTransitionP1<TActor>;
    }

    return curryTransition as CurryTransition;
  };

  return curryTransition;
};

const createTransitionWithFn = (stop = false) => {
  const curryTransitionWith = <TActor extends AnyStateMachineActor>(
    actor?: TActor,
    options?: AuditionOptions,
    source?: string,
    target?: string,
  ) => {
    if (actor) {
      if (options) {
        if (source) {
          if (target) {
            return untilTransition(actor, {...options, stop}, source, target);
          }

          return ((target?: string) => {
            return target
              ? curryTransitionWith(actor, options, source, target)
              : curryTransitionWith(actor, options, source);
          }) as CurryTransitionWithP3<TActor>;
        }

        return ((source?: string, target?: string) => {
          if (source) {
            return target
              ? curryTransitionWith(actor, options, source, target)
              : curryTransitionWith(actor, options, source);
          }

          return curryTransitionWith(actor, options);
        }) as CurryTransitionWithP2<TActor>;
      }

      return ((options?: AuditionOptions, source?: string) => {
        if (options) {
          return source
            ? curryTransitionWith(actor, options, source)
            : curryTransitionWith(actor, options);
        }

        return curryTransitionWith(actor);
      }) as CurryTransitionWithP1<TActor>;
    }

    return curryTransitionWith as CurryTransitionWith;
  };

  return curryTransitionWith;
};

const untilTransition = <TActor extends AnyStateMachineActor>(
  actor: TActor,
  options: InternalAuditionOptions,
  source: string,
  target: string,
): Promise<void> => {
  const opts = applyDefaults(options);

  const {inspector, stop, timeout} = opts;

  const {id} = actor;

  const inspectorObserver = xs.toObserver(inspector);

  const hasTransition = (
    sourceId: string,
    targetId: string,
    {_transitions: transitions}: InspectedMicrostepEvent,
  ) =>
    transitions.some(
      ({source, target}) =>
        !!(source.id === sourceId && target?.some(({id}) => id === targetId)),
    );

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<void>();

  const didTransition = false;

  /**
   * Returns `true` if the event represents the transition from the `source`
   * state to the `target` state.
   *
   * @param evt Inspection event
   * @returns `true` if the event represents the transition from the `source`
   *   state to the `target` state
   */
  const isTargetTransition = (evt: xs.InspectionEvent): boolean => {
    return (
      isInspectedMicrostepEvent(evt) &&
      isActorRef(evt.actorRef) &&
      evt.actorRef.id === id &&
      hasTransition(source, target, evt)
    );
  };

  const transitionInspector: xs.Observer<xs.InspectionEvent> = {
    complete: () => {
      inspectorObserver.complete?.();
      if (abortController.signal.aborted) {
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
      if (abortController.signal.aborted) {
        return;
      }
      reject(err);
    },
    next: (evt: xs.InspectionEvent) => {
      inspectorObserver.next?.(evt);
      maybePatchActorRef(evt);

      if (abortController.signal.aborted) {
        return;
      }

      if (isTargetTransition(evt)) {
        if (stop) {
          actor.stop();
        }
        resolve();
      }
    },
  };

  const maybePatchActorRef = createPatcher({
    ...opts,
    inspector: transitionInspector,
  });

  maybePatchActorRef(actor);

  if (!hasStateKey(actor, source)) {
    throw new ReferenceError(`Unknown state ID (source): ${source}`);
  }
  if (!hasStateKey(actor, target)) {
    throw new ReferenceError(`Unknown state ID (target): ${target}`);
  }

  startTimer(
    actor,
    abortController,
    timeout,
    `Transition from ${source} to ${target} not detected in ${timeout}ms`,
  );

  void xs.toPromise(actor).catch(reject);

  actor.start();

  return promise;
};

const waitForTransition_ = createTransitionFn(false);

const runUntilTransition_ = createTransitionFn(true);

const runUntilTransitionWith_ = createTransitionWithFn(true);

const waitForTransitionWith_ = createTransitionWithFn(false);
