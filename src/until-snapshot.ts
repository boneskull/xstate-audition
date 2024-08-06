import {curry} from 'fnts';
import * as xs from 'xstate';

import {attachActor, createActorThenable} from './actor.js';
import {
  ActorLogicWithSnapshot,
  type ActorThenable,
  type AuditionOptions,
} from './types.js';
import {applyDefaults} from './util.js';

const untilSnapshot = <T extends ActorLogicWithSnapshot>(
  actor: xs.Actor<T>,
  predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
  options?: AuditionOptions,
): ActorThenable<T, xs.SnapshotFrom<T>> => {
  actor = attachActor(actor, options);
  const {timeout, stop} = applyDefaults(options);
  actor.start();

  return createActorThenable(
    actor,
    xs
      .waitFor(actor, predicate, {timeout})
      .catch((err) => {
        if (err instanceof Error) {
          // TODO: press xstate for error codes
          if (err.message.startsWith('Timeout of')) {
            throw new Error(
              `Snapshot did not match predicate in ${timeout}ms`,
              {cause: err},
            );
          } else if (
            err.message.startsWith(
              'Actor terminated without satisfying predicate',
            )
          ) {
            throw new Error(`Actor terminated before satisfying predicate`, {
              cause: err,
            });
          }
        }
        throw err;
      })
      .finally(() => {
        if (stop) {
          actor.stop();
        }
      }),
  );
};

/**
 * Runs an actor until the snapshot predicate returns `true`.
 *
 * Immediately stops the actor thereafter.
 *
 * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
 * may be sent to the actor.
 *
 * @template T Actor logic which emits snapshots
 * @param actor An existing {@link Actor}
 * @param predicate Snapshot predicate; see {@link xs.waitFor}
 * @returns {@link ActorThenable} Fulfilling with the snapshot that matches the
 *   predicate
 */
const _runUntilSnapshot = <T extends ActorLogicWithSnapshot>(
  actor: xs.Actor<T>,
  predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
): ActorThenable<T, xs.SnapshotFrom<T>> => {
  return untilSnapshot(actor, predicate, {stop: true});
};

/**
 * Runs an actor until the snapshot predicate returns `true`.
 *
 * Immediately stops the actor thereafter.
 *
 * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
 * may be sent to the actor.
 *
 * @template T Actor logic which emits snapshots
 * @param actor An existing {@link Actor}
 * @param predicate Snapshot predicate; see {@link xs.waitFor}
 * @param options Options
 * @returns {@link ActorThenable} Fulfilling with the snapshot that matches the
 *   predicate
 */
const _runUntilSnapshotWith = <T extends ActorLogicWithSnapshot>(
  actor: xs.Actor<T>,
  predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
  options: AuditionOptions,
): ActorThenable<T, xs.SnapshotFrom<T>> => {
  return untilSnapshot(actor, predicate, {...options, stop: true});
};

const _waitUntilSnapshot = <T extends ActorLogicWithSnapshot>(
  actor: xs.Actor<T>,
  predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
): ActorThenable<T, xs.SnapshotFrom<T>> => {
  return untilSnapshot(actor, predicate, {stop: false});
};

const _waitUntilSnapshotWith = <T extends ActorLogicWithSnapshot>(
  actor: xs.Actor<T>,
  predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
  options: AuditionOptions,
): ActorThenable<T, xs.SnapshotFrom<T>> => {
  return untilSnapshot(actor, predicate, {...options, stop: false});
};
export const waitUntilSnapshot = curry(_waitUntilSnapshot);

export const waitUntilSnapshotWith = curry(_waitUntilSnapshotWith);

export const runUntilSnapshotWith = curry(_runUntilSnapshotWith);

export const runUntilSnapshot = curry(_runUntilSnapshot);
