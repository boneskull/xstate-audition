import {curry} from 'fnts';
import * as xs from 'xstate';

import {attachActor, createActorThenable} from './actor.js';
import {
  type InspectedMicrostepEvent,
  isInspectedMicrostepEvent,
} from './guard.js';
import {type ActorThenable, type AuditionOptions} from './types.js';
import {applyDefaults, createAbortablePromiseKit, startTimer} from './util.js';

const untilTransition = <T extends xs.AnyStateMachine>(
  actor: xs.Actor<T>,
  source: string,
  target: string,
  options: AuditionOptions = {},
): ActorThenable<T> => {
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

  let didTransition = false;
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
    throw new Error(`Unknown state ID (source): ${source}`);
  }
  if (!idMap.has(target)) {
    throw new Error(`Unknown state ID (target): ${target}`);
  }

  if (timeout !== Infinity) {
    startTimer(ac, timeout, `Actor did not complete in ${timeout}ms`);
  }

  actor.start();
  return createActorThenable(actor, promise);
};

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
const _runUntilTransition = <T extends xs.AnyStateMachine>(
  actor: xs.Actor<T>,
  source: string,
  target: string,
): ActorThenable<T> => {
  return untilTransition(actor, source, target, {stop: true});
};

const _runUntilTransitionWith = <T extends xs.AnyStateMachine>(
  actor: xs.Actor<T>,
  source: string,
  target: string,
  options: AuditionOptions,
): ActorThenable<T> => {
  return untilTransition(actor, source, target, {...options, stop: true});
};

const _waitForTransition = <T extends xs.AnyStateMachine>(
  actor: xs.Actor<T>,
  source: string,
  target: string,
): ActorThenable<T> => {
  return untilTransition(actor, source, target);
};

const _waitForTransitionWith = <T extends xs.AnyStateMachine>(
  actor: xs.Actor<T>,
  source: string,
  target: string,
  options: AuditionOptions,
): ActorThenable<T> => {
  return untilTransition(actor, source, target, {...options, stop: false});
};

export const waitForTransition = curry(_waitForTransition);

export const waitForTransitionWith = curry(_waitForTransitionWith);

export const runUntilTransitionWith = curry(_runUntilTransitionWith);

export const runUntilTransition = curry(_runUntilTransition);
