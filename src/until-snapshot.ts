import * as xs from 'xstate';

import {attachActor, createActorThenable} from './actor.js';
import {applyDefaults} from './defaults.js';
import {
  type ActorThenable,
  type AuditionOptions,
  type SnapshottableLogic,
} from './types.js';

export type {SnapshottableLogic as ActorLogicWithSnapshot};

export type CurrySnapshot =
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
      predicate: SnapshotPredicate<Logic>,
    ) => CurrySnapshotP2<Logic>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
    ) => CurrySnapshotP1<Logic>)
  | (() => CurrySnapshot);

export type CurrySnapshotP1<Logic extends xs.AnyStateMachine> =
  | (() => CurrySnapshotP1<Logic>)
  | ((predicate: SnapshotPredicate<Logic>) => CurrySnapshotP2<Logic>);

export type CurrySnapshotP2<Logic extends xs.AnyStateMachine> =
  ActorThenable<Logic>;

export type CurrySnapshotWith =
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
      predicate: SnapshotPredicate<Logic>,
      options: AuditionOptions,
    ) => CurrySnapshotWithP3<Logic>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
      predicate: SnapshotPredicate<Logic>,
    ) => CurrySnapshotWithP2<Logic>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
    ) => CurrySnapshotWithP1<Logic>)
  | (() => CurrySnapshotWith);

export type CurrySnapshotWithP1<Logic extends xs.AnyStateMachine> =
  | ((
      predicate: SnapshotPredicate<Logic>,
      options: AuditionOptions,
    ) => CurrySnapshotWithP3<Logic>)
  | (() => CurrySnapshotWithP1<Logic>)
  | ((predicate: SnapshotPredicate<Logic>) => CurrySnapshotWithP2<Logic>);

export type CurrySnapshotWithP2<Logic extends xs.AnyStateMachine> =
  | (() => CurrySnapshotWithP2<Logic>)
  | ((options: AuditionOptions) => CurrySnapshotWithP3<Logic>);

export type CurrySnapshotWithP3<Logic extends xs.AnyStateMachine> =
  ActorThenable<Logic>;

type SnapshotFn = <
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(
  actor: Actor,
  predicate: SnapshotPredicate<Logic>,
  options: AuditionOptions,
) => ActorThenable<Logic>;

export type SnapshotPredicate<T extends SnapshottableLogic> = (
  snapshot: xs.SnapshotFrom<T>,
) => boolean;

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
export function runUntilSnapshot(): CurrySnapshot;

export function runUntilSnapshot<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(actor: Actor): CurrySnapshotP1<Logic>;

export function runUntilSnapshot<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(actor: Actor, predicate: SnapshotPredicate<Logic>): CurrySnapshotP2<Logic>;

export function runUntilSnapshot<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(actor?: Actor, predicate?: SnapshotPredicate<Logic>) {
  return runUntilSnapshot_(actor, predicate);
}

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
export function runUntilSnapshotWith(): CurrySnapshotWith;

export function runUntilSnapshotWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(actor: Actor): CurrySnapshotWithP1<Logic>;

export function runUntilSnapshotWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(
  actor: Actor,
  predicate: SnapshotPredicate<Logic>,
): CurrySnapshotWithP2<Logic>;

export function runUntilSnapshotWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(
  actor: Actor,
  predicate: SnapshotPredicate<Logic>,
  options: AuditionOptions,
): CurrySnapshotWithP3<Logic>;

export function runUntilSnapshotWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(
  actor?: Actor,
  predicate?: SnapshotPredicate<Logic>,
  options?: AuditionOptions,
) {
  return runUntilSnapshotWith_(actor, predicate, options);
}

export function waitForSnapshot(): CurrySnapshot;

export function waitForSnapshot<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(actor: Actor): CurrySnapshotP1<Logic>;

export function waitForSnapshot<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(actor: Actor, predicate: SnapshotPredicate<Logic>): CurrySnapshotP2<Logic>;

export function waitForSnapshot<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(actor?: Actor, predicate?: SnapshotPredicate<Logic>) {
  return waitForSnapshot_(actor, predicate);
}

export function waitForSnapshotWith(): CurrySnapshotWith;

export function waitForSnapshotWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(actor: Actor): CurrySnapshotWithP1<Logic>;

export function waitForSnapshotWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(
  actor: Actor,
  predicate: SnapshotPredicate<Logic>,
): CurrySnapshotWithP2<Logic>;

export function waitForSnapshotWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(
  actor: Actor,
  predicate: SnapshotPredicate<Logic>,
  options: AuditionOptions,
): CurrySnapshotWithP3<Logic>;

export function waitForSnapshotWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(
  actor?: Actor,
  predicate?: SnapshotPredicate<Logic>,
  options?: AuditionOptions,
) {
  return waitForSnapshotWith_(actor, predicate, options);
}

const untilSnapshot = <
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(
  actor: Actor,
  predicate: SnapshotPredicate<Logic>,
  options?: AuditionOptions,
): ActorThenable<Logic, xs.SnapshotFrom<Logic>> => {
  actor = attachActor(actor, options);

  const {stop, timeout} = applyDefaults(options);

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

const createSnapshotFn = <T extends SnapshotFn>(
  snapshotFn: T,
  stop = false,
) => {
  const currySnapshot = <
    Actor extends xs.Actor<Logic>,
    Logic extends xs.AnyStateMachine,
  >(
    actor?: Actor,
    predicate?: SnapshotPredicate<Logic>,
  ) => {
    if (actor) {
      if (predicate) {
        return snapshotFn(actor, predicate, {stop}) as CurrySnapshotP2<Logic>;
      }
      return ((predicate?: SnapshotPredicate<Logic>) =>
        predicate
          ? currySnapshot(actor, predicate)
          : currySnapshot(actor)) as CurrySnapshotP1<Logic>;
    }
    return currySnapshot as CurrySnapshot;
  };

  return currySnapshot;
};

const createSnapshotWithFn = <T extends SnapshotFn>(
  snapshotFn: T,
  stop = false,
) => {
  const currySnapshotWith = <
    Actor extends xs.Actor<Logic>,
    Logic extends xs.AnyStateMachine,
  >(
    actor?: Actor,
    predicate?: SnapshotPredicate<Logic>,
    options?: AuditionOptions,
  ) => {
    if (actor) {
      if (predicate) {
        if (options) {
          return snapshotFn(actor, predicate, {
            ...options,
            stop,
          });
        }
        return ((options?: AuditionOptions) => {
          return options
            ? currySnapshotWith(actor, predicate, options)
            : currySnapshotWith(actor, predicate);
        }) as CurrySnapshotWithP2<Logic>;
      }
      return ((
        predicate?: SnapshotPredicate<Logic>,
        options?: AuditionOptions,
      ) => {
        if (predicate) {
          return options
            ? currySnapshotWith(actor, predicate, options)
            : currySnapshotWith(actor, predicate);
        }
        return currySnapshotWith(actor);
      }) as CurrySnapshotWithP1<Logic>;
    }
    return currySnapshotWith as CurrySnapshotWith;
  };

  return currySnapshotWith;
};

const runUntilSnapshot_ = createSnapshotFn(untilSnapshot, true);

const waitForSnapshot_ = createSnapshotFn(untilSnapshot, false);

const runUntilSnapshotWith_ = createSnapshotWithFn(untilSnapshot, true);

const waitForSnapshotWith_ = createSnapshotWithFn(untilSnapshot, false);
