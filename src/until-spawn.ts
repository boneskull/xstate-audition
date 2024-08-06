import {curry} from 'fnts';
import * as xs from 'xstate';

import {attachActor, createActorThenable} from './actor.js';
import {isString} from './guard.js';
import {type ActorThenable, type AuditionOptions} from './types.js';
import {applyDefaults, createAbortablePromiseKit, startTimer} from './util.js';

const untilSpawn = <T extends xs.AnyStateMachine>(
  actor: xs.Actor<T>,
  target: string | RegExp,
  options?: AuditionOptions,
): ActorThenable<T, xs.AnyActorRef> => {
  const {timeout, stop, inspector} = applyDefaults(options);
  const inspectorObserver = xs.toObserver(inspector);

  const {
    abortController: ac,
    promise,
    reject,
    resolve,
  } = createAbortablePromiseKit<xs.AnyActorRef>();

  const predicate = isString(target)
    ? (id: string) => id === target
    : (id: string) => target.test(id);

  let didSpawn = false;

  const spawnInspector: xs.Observer<xs.InspectionEvent> = {
    complete: () => {
      inspectorObserver.complete?.();

      if (ac.signal.aborted) {
        return;
      }

      if (!didSpawn) {
        reject(
          new Error(`Actor completed before spawning actor matching ${target}`),
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
    next: (evt) => {
      if (ac.signal.aborted) {
        return;
      }

      if (predicate(evt.actorRef.id)) {
        didSpawn = true;
        resolve(evt.actorRef);
        if (stop) {
          actor.stop();
        }
      }
    },
  };

  actor = attachActor(actor, {...options, inspector: spawnInspector});

  if (timeout !== Infinity) {
    startTimer(
      ac,
      timeout,
      `Failed to detect an spawned actor matching ${target} in ${timeout}ms`,
    );
  }

  actor.start();

  return createActorThenable(actor, promise);
};

const _runUntilSpawn = <T extends xs.AnyStateMachine>(
  actor: xs.Actor<T>,
  target: string | RegExp,
): ActorThenable<T, xs.AnyActorRef> => {
  return untilSpawn(actor, target, {stop: true});
};

const _runUntilSpawnWith = <T extends xs.AnyStateMachine>(
  actor: xs.Actor<T>,
  target: string | RegExp,
  options: AuditionOptions,
): ActorThenable<T, xs.AnyActorRef> => {
  return untilSpawn(actor, target, {...options, stop: true});
};

/**
 * Waits for an actor to spawn another actor matching `target`.
 *
 * @template T State machine logic
 * @param actor An existing {@link xs.Actor}
 * @param target A string or RegExp to match against the spawned actor ID
 * @returns The `ActorRef` of the spawned actor
 */
const _waitUntilSpawn = <T extends xs.AnyStateMachine>(
  actor: xs.Actor<T>,
  target: string | RegExp,
): ActorThenable<T, xs.AnyActorRef> => {
  return untilSpawn(actor, target, {stop: false});
};

const _waitUntilSpawnWith = <T extends xs.AnyStateMachine>(
  actor: xs.Actor<T>,
  target: string | RegExp,
  options: AuditionOptions,
): ActorThenable<T, xs.AnyActorRef> => {
  return untilSpawn(actor, target, {...options, stop: false});
};
export const waitUntilSpawn = curry(_waitUntilSpawn);

export const waitUntilSpawnWith = curry(_waitUntilSpawnWith);

export const runUntilSpawnWith = curry(_runUntilSpawnWith);

export const runUntilSpawn = curry(_runUntilSpawn);
