import * as xs from 'xstate';

import {patchActor} from './actor.js';
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
  isInspectedMicrostepEvent,
} from './util.js';

export type CurryTransition = (() => CurryTransition) &
  (<Actor extends AnyStateMachineActor>(
    actor: Actor,
    source: string,
    target: string,
  ) => CurryTransitionP3) &
  (<Actor extends AnyStateMachineActor>(
    actor: Actor,
    source: string,
  ) => CurryTransitionP2<Actor>) &
  (<Actor extends AnyStateMachineActor>(
    actor: Actor,
  ) => CurryTransitionP1<Actor>);

export type CurryTransitionP1<Actor extends AnyStateMachineActor> =
  (() => CurryTransitionP1<Actor>) &
    ((source: string) => CurryTransitionP2<Actor>) &
    ((source: string, target: string) => CurryTransitionP3);

export type CurryTransitionP2<Actor extends AnyStateMachineActor> =
  (() => CurryTransitionP2<Actor>) & ((target: string) => CurryTransitionP3);

export type CurryTransitionP3 = Promise<void>;

export type CurryTransitionWith = (() => CurryTransitionWith) &
  (<Actor extends AnyStateMachineActor>(
    actor: Actor,
    options: AuditionOptions,
    source: string,
    target: string,
  ) => CurryTransitionWithP4) &
  (<Actor extends AnyStateMachineActor>(
    actor: Actor,
    options: AuditionOptions,
    source: string,
  ) => CurryTransitionWithP3<Actor>) &
  (<Actor extends AnyStateMachineActor>(
    actor: Actor,
    options: AuditionOptions,
  ) => CurryTransitionWithP2<Actor>) &
  (<Actor extends AnyStateMachineActor>(
    actor: Actor,
  ) => CurryTransitionWithP1<Actor>);

// conflict with eslint-plugin-perfectionist
// prettier-ignore
export type CurryTransitionWithP1<Actor extends AnyStateMachineActor> =
  & ((
      options: AuditionOptions,
      source: string,
      target: string,
    ) => CurryTransitionWithP4)
  & (() => CurryTransitionWithP1<Actor>)
  & ((options: AuditionOptions) => CurryTransitionWithP2<Actor>)
  & ((options: AuditionOptions, source: string) => CurryTransitionWithP3<Actor>);

// conflict with eslint-plugin-perfectionist
// prettier-ignore
export type CurryTransitionWithP2<Actor extends AnyStateMachineActor> =
  & ((
      source: string,
      target: string,
    ) => CurryTransitionWithP4)
  & (() => CurryTransitionWithP2<Actor>)
  & ((source: string) => CurryTransitionWithP3<Actor>);

export type CurryTransitionWithP3<Actor extends AnyStateMachineActor> =
  (() => CurryTransitionWithP3<Actor>) &
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
 * @template T A state machine
 * @param actor An existing {@link Actor}
 * @param source Source state ID
 * @param target Target state ID
 */

export function runUntilTransition<Actor extends AnyStateMachineActor>(
  actor: Actor,
  source: string,
  target: string,
): CurryTransitionP3;

export function runUntilTransition<Actor extends AnyStateMachineActor>(
  actor: Actor,
  source: string,
): CurryTransitionP2<Actor>;

export function runUntilTransition<Actor extends AnyStateMachineActor>(
  actor: Actor,
): CurryTransitionP1<Actor>;

export function runUntilTransition(): CurryTransition;

export function runUntilTransition<Actor extends AnyStateMachineActor>(
  actor?: Actor,
  source?: string,
  target?: string,
) {
  return runUntilTransition_(actor, source, target);
}

export function runUntilTransitionWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: AuditionOptions,
  source: string,
  target: string,
): CurryTransitionWithP4;

export function runUntilTransitionWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: AuditionOptions,
  source: string,
): CurryTransitionWithP3<Actor>;

export function runUntilTransitionWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: AuditionOptions,
): CurryTransitionWithP2<Actor>;

export function runUntilTransitionWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
): CurryTransitionWithP1<Actor>;

export function runUntilTransitionWith(): CurryTransitionWith;

export function runUntilTransitionWith<Actor extends AnyStateMachineActor>(
  actor?: Actor,
  options?: AuditionOptions,
  source?: string,
  target?: string,
) {
  return runUntilTransitionWith_(actor, options, source, target);
}

export function waitForTransition(): CurryTransition;

export function waitForTransition<Actor extends AnyStateMachineActor>(
  actor: Actor,
): CurryTransitionP1<Actor>;

export function waitForTransition<Actor extends AnyStateMachineActor>(
  actor: Actor,
  source: string,
): CurryTransitionP2<Actor>;

export function waitForTransition<Actor extends AnyStateMachineActor>(
  actor: Actor,
  source: string,
  target: string,
): CurryTransitionP3;

export function waitForTransition<Actor extends AnyStateMachineActor>(
  actor?: Actor,
  source?: string,
  target?: string,
) {
  return waitForTransition_(actor, source, target);
}

export function waitForTransitionWith(): CurryTransitionWith;

export function waitForTransitionWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
): CurryTransitionWithP1<Actor>;

export function waitForTransitionWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: AuditionOptions,
): CurryTransitionWithP2<Actor>;

export function waitForTransitionWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: AuditionOptions,
  source: string,
): CurryTransitionWithP3<Actor>;

export function waitForTransitionWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: AuditionOptions,
  source: string,
  target: string,
): CurryTransitionWithP4;

export function waitForTransitionWith<Actor extends AnyStateMachineActor>(
  actor?: Actor,
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
const hasStateKey = <Actor extends AnyStateMachineActor>(
  actor: Actor,
  stateId: string,
): boolean => {
  // @ts-expect-error internal
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const idMap: Map<string, unknown> = actor.logic.idMap;

  return idMap.has(stateId);
};

const createTransitionFn = (stop = false) => {
  const curryTransition = <Actor extends AnyStateMachineActor>(
    actor?: Actor,
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
        }) as CurryTransitionP2<Actor>;
      }

      return ((source?: string, target?: string) => {
        if (source) {
          return target
            ? curryTransition(actor, source, target)
            : curryTransition(actor, source);
        }

        return source ? curryTransition(actor, source) : curryTransition(actor);
      }) as CurryTransitionP1<Actor>;
    }

    return curryTransition as CurryTransition;
  };

  return curryTransition;
};

const createTransitionWithFn = (stop = false) => {
  const curryTransitionWith = <Actor extends AnyStateMachineActor>(
    actor?: Actor,
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
          }) as CurryTransitionWithP3<Actor>;
        }

        return ((source?: string, target?: string) => {
          if (source) {
            return target
              ? curryTransitionWith(actor, options, source, target)
              : curryTransitionWith(actor, options, source);
          }

          return curryTransitionWith(actor, options);
        }) as CurryTransitionWithP2<Actor>;
      }

      return ((options?: AuditionOptions, source?: string) => {
        if (options) {
          return source
            ? curryTransitionWith(actor, options, source)
            : curryTransitionWith(actor, options);
        }

        return curryTransitionWith(actor);
      }) as CurryTransitionWithP1<Actor>;
    }

    return curryTransitionWith as CurryTransitionWith;
  };

  return curryTransitionWith;
};

const untilTransition = <Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: InternalAuditionOptions,
  source: string,
  target: string,
): Promise<void> => {
  const opts = applyDefaults(options);

  const {inspector, logger, stop, timeout} = opts;

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

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<void>();

  const didTransition = false;

  const seenActors: WeakSet<xs.AnyActorRef> = new WeakSet();

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

      if (!seenActors.has(evt.actorRef)) {
        patchActor(evt.actorRef, {logger});
        seenActors.add(evt.actorRef);
      }

      if (abortController.signal.aborted) {
        return;
      }

      if (
        isInspectedMicrostepEvent(evt) &&
        evt.actorRef.id === id &&
        hasTransition(source, target, evt)
      ) {
        if (stop) {
          actor.stop();
        }
        resolve();
      }
    },
  };

  patchActor(actor, {
    ...opts,
    inspector: transitionInspector,
  });
  seenActors.add(actor);

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
