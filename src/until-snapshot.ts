import * as xs from 'xstate';

import {attachActor} from './actor.js';
import {applyDefaults} from './defaults.js';
import {
  type AnySnapshottableActor,
  type AuditionOptions,
  type InternalAuditionOptions,
  type SnapshottableLogic,
} from './types.js';

export type {SnapshottableLogic as ActorLogicWithSnapshot};

export type CurrySnapshot =
  | (() => <Actor extends AnySnapshottableActor>(
      actor: Actor,
      predicate: SnapshotPredicate<Actor['logic']>,
    ) => CurrySnapshotP2<Actor>)
  | (() => <Actor extends AnySnapshottableActor>(
      actor: Actor,
    ) => CurrySnapshotP1<Actor>)
  | (() => CurrySnapshot);

export type CurrySnapshotP1<Actor extends AnySnapshottableActor> =
  | (() => CurrySnapshotP1<Actor>)
  | ((predicate: SnapshotPredicate<Actor['logic']>) => CurrySnapshotP2<Actor>);

export type CurrySnapshotP2<Actor extends AnySnapshottableActor> = Promise<
  xs.SnapshotFrom<Actor['logic']>
>;

export type CurrySnapshotWith =
  | (() => <Actor extends AnySnapshottableActor>(
      actor: Actor,
      predicate: SnapshotPredicate<Actor['logic']>,
      options: AuditionOptions,
    ) => CurrySnapshotWithP3<Actor>)
  | (() => <Actor extends AnySnapshottableActor>(
      actor: Actor,
      predicate: SnapshotPredicate<Actor['logic']>,
    ) => CurrySnapshotWithP2<Actor>)
  | (() => <Actor extends AnySnapshottableActor>(
      actor: Actor,
    ) => CurrySnapshotWithP1<Actor>)
  | (() => CurrySnapshotWith);

export type CurrySnapshotWithP1<Actor extends AnySnapshottableActor> =
  | ((
      predicate: SnapshotPredicate<Actor['logic']>,
      options: AuditionOptions,
    ) => CurrySnapshotWithP3<Actor>)
  | ((
      predicate: SnapshotPredicate<Actor['logic']>,
    ) => CurrySnapshotWithP2<Actor>)
  | (() => CurrySnapshotWithP1<Actor>);

export type CurrySnapshotWithP2<Actor extends AnySnapshottableActor> =
  | (() => CurrySnapshotWithP2<Actor>)
  | ((options: AuditionOptions) => CurrySnapshotWithP3<Actor>);

export type CurrySnapshotWithP3<Actor extends AnySnapshottableActor> = Promise<
  xs.SnapshotFrom<Actor['logic']>
>;

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

export function runUntilSnapshot<Actor extends AnySnapshottableActor>(
  actor: Actor,
): CurrySnapshotP1<Actor>;

export function runUntilSnapshot<Actor extends AnySnapshottableActor>(
  actor: Actor,
  predicate: SnapshotPredicate<Actor['logic']>,
): CurrySnapshotP2<Actor>;

export function runUntilSnapshot<Actor extends AnySnapshottableActor>(
  actor?: Actor,
  predicate?: SnapshotPredicate<Actor['logic']>,
) {
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

export function runUntilSnapshotWith<Actor extends AnySnapshottableActor>(
  actor: Actor,
): CurrySnapshotWithP1<Actor>;

export function runUntilSnapshotWith<Actor extends AnySnapshottableActor>(
  actor: Actor,
  options: AuditionOptions,
): CurrySnapshotWithP2<Actor>;

export function runUntilSnapshotWith<Actor extends AnySnapshottableActor>(
  actor: Actor,
  options: AuditionOptions,
  predicate: SnapshotPredicate<Actor['logic']>,
): CurrySnapshotWithP3<Actor>;

export function runUntilSnapshotWith<Actor extends AnySnapshottableActor>(
  actor?: Actor,
  options?: AuditionOptions,
  predicate?: SnapshotPredicate<Actor['logic']>,
) {
  return runUntilSnapshotWith_(actor, options, predicate);
}

export function waitForSnapshot(): CurrySnapshot;

export function waitForSnapshot<Actor extends AnySnapshottableActor>(
  actor: Actor,
): CurrySnapshotP1<Actor>;

export function waitForSnapshot<Actor extends AnySnapshottableActor>(
  actor: Actor,
  predicate?: SnapshotPredicate<Actor['logic']>,
): CurrySnapshotP2<Actor>;

export function waitForSnapshot<Actor extends AnySnapshottableActor>(
  actor?: Actor,
  predicate?: SnapshotPredicate<Actor['logic']>,
) {
  return waitForSnapshot_(actor, predicate);
}

export function waitForSnapshotWith(): CurrySnapshotWith;

export function waitForSnapshotWith<Actor extends AnySnapshottableActor>(
  actor: Actor,
): CurrySnapshotWithP1<Actor>;

export function waitForSnapshotWith<Actor extends AnySnapshottableActor>(
  actor: Actor,
  options: AuditionOptions,
): CurrySnapshotWithP2<Actor>;

export function waitForSnapshotWith<Actor extends AnySnapshottableActor>(
  actor: Actor,
  options: AuditionOptions,
  predicate: SnapshotPredicate<Actor['logic']>,
): CurrySnapshotWithP3<Actor>;

export function waitForSnapshotWith<Actor extends AnySnapshottableActor>(
  actor?: Actor,
  options?: AuditionOptions,
  predicate?: SnapshotPredicate<Actor['logic']>,
) {
  return waitForSnapshotWith_(actor, options, predicate);
}

const untilSnapshot = <Actor extends AnySnapshottableActor>(
  actor: Actor,
  options: InternalAuditionOptions,
  predicate: SnapshotPredicate<Actor['logic']>,
): Promise<xs.SnapshotFrom<Actor['logic']>> => {
  const opts = applyDefaults(options);

  const {inspector, logger, stop, timeout} = opts;

  const inspectorObserver = xs.toObserver(inspector);

  const seenActors: WeakSet<xs.AnyActorRef> = new WeakSet();

  const snapshotInspector: xs.Observer<xs.InspectionEvent> = {
    complete: inspectorObserver.complete,
    error: inspectorObserver.error,
    next: (evt) => {
      inspectorObserver.next?.(evt);
      if (!seenActors.has(evt.actorRef)) {
        attachActor(evt.actorRef, {logger});
        seenActors.add(evt.actorRef);
      }
    },
  };

  attachActor(actor, {...opts, inspector: snapshotInspector});
  seenActors.add(actor);

  const promise = xs
    .waitFor(actor, predicate, {timeout})
    .catch((err) => {
      if (err instanceof Error) {
        // TODO: press xstate for error codes
        if (err.message.startsWith('Timeout of')) {
          throw new Error(`Snapshot did not match predicate in ${timeout}ms`, {
            cause: err,
          });
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
    });

  actor.start();

  return promise;
};

const createSnapshotFn = (stop = false) => {
  const currySnapshot = <Actor extends AnySnapshottableActor>(
    actor?: Actor,
    predicate?: SnapshotPredicate<Actor['logic']>,
  ) => {
    if (actor) {
      if (predicate) {
        return untilSnapshot(
          actor,
          {
            stop,
          },
          predicate,
        ) as CurrySnapshotP2<Actor>;
      }

      return ((predicate?: SnapshotPredicate<Actor['logic']>) =>
        predicate
          ? currySnapshot(actor, predicate)
          : currySnapshot(actor)) as CurrySnapshotP1<Actor>;
    }

    return currySnapshot as CurrySnapshot;
  };

  return currySnapshot;
};

const createSnapshotWithFn = (stop = false) => {
  const currySnapshotWith = <Actor extends AnySnapshottableActor>(
    actor?: Actor,
    options?: AuditionOptions,
    predicate?: SnapshotPredicate<Actor['logic']>,
  ) => {
    if (actor) {
      if (options) {
        if (predicate) {
          return untilSnapshot(
            actor,
            {
              ...options,
              stop,
            },
            predicate,
          );
        }

        return ((predicate?: SnapshotPredicate<Actor['logic']>) => {
          return predicate
            ? currySnapshotWith(actor, options, predicate)
            : currySnapshotWith(actor, options);
        }) as CurrySnapshotWithP2<Actor>;
      }

      return ((
        options?: AuditionOptions,
        predicate?: SnapshotPredicate<Actor['logic']>,
      ) => {
        if (options) {
          return predicate
            ? currySnapshotWith(actor, options, predicate)
            : currySnapshotWith(actor, options);
        }

        return currySnapshotWith(actor);
      }) as CurrySnapshotWithP1<Actor>;
    }

    return currySnapshotWith as CurrySnapshotWith;
  };

  return currySnapshotWith;
};

const runUntilSnapshot_ = createSnapshotFn(true);

const waitForSnapshot_ = createSnapshotFn(false);

const runUntilSnapshotWith_ = createSnapshotWithFn(true);

const waitForSnapshotWith_ = createSnapshotWithFn(false);
