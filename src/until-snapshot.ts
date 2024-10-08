import * as xs from 'xstate';

import {createPatcher} from './actor.js';
import {applyDefaults} from './defaults.js';
import {
  type AnySnapshotEmitterActor,
  type AnySnapshotEmitterLogic,
  type AuditionOptions,
  type InternalAuditionOptions,
} from './types.js';

export type CurrySnapshot = (() => CurrySnapshot) &
  (<TActor extends AnySnapshotEmitterActor>(
    actor: TActor,
  ) => CurrySnapshotP1<TActor>) &
  (<TActor extends AnySnapshotEmitterActor>(
    actor: TActor,
    predicate: SnapshotPredicate<TActor['logic']>,
  ) => CurrySnapshotP2<TActor>);

export type CurrySnapshotP1<TActor extends AnySnapshotEmitterActor> =
  (() => CurrySnapshotP1<TActor>) &
    ((
      predicate: SnapshotPredicate<TActor['logic']>,
    ) => CurrySnapshotP2<TActor>);

export type CurrySnapshotP2<TActor extends AnySnapshotEmitterActor> = Promise<
  xs.SnapshotFrom<TActor['logic']>
>;

export type CurrySnapshotWith = (() => CurrySnapshotWith) &
  (<TActor extends AnySnapshotEmitterActor>(
    actor: TActor,
  ) => CurrySnapshotWithP1<TActor>) &
  (<TActor extends AnySnapshotEmitterActor>(
    actor: TActor,
    predicate: SnapshotPredicate<TActor['logic']>,
  ) => CurrySnapshotWithP2<TActor>) &
  (<TActor extends AnySnapshotEmitterActor>(
    actor: TActor,
    predicate: SnapshotPredicate<TActor['logic']>,
    options: AuditionOptions,
  ) => CurrySnapshotWithP3<TActor>);

export type CurrySnapshotWithP1<TActor extends AnySnapshotEmitterActor> =
  (() => CurrySnapshotWithP1<TActor>) &
    ((
      predicate: SnapshotPredicate<TActor['logic']>,
    ) => CurrySnapshotWithP2<TActor>) &
    ((
      predicate: SnapshotPredicate<TActor['logic']>,
      options: AuditionOptions,
    ) => CurrySnapshotWithP3<TActor>);

export type CurrySnapshotWithP2<TActor extends AnySnapshotEmitterActor> =
  (() => CurrySnapshotWithP2<TActor>) &
    ((options: AuditionOptions) => CurrySnapshotWithP3<TActor>);

export type CurrySnapshotWithP3<TActor extends AnySnapshotEmitterActor> =
  Promise<xs.SnapshotFrom<TActor['logic']>>;

export type SnapshotPredicate<T extends AnySnapshotEmitterLogic> = (
  snapshot: xs.SnapshotFrom<T>,
) => boolean;

export function runUntilSnapshot(): CurrySnapshot;

export function runUntilSnapshot<TActor extends AnySnapshotEmitterActor>(
  actor: TActor,
): CurrySnapshotP1<TActor>;

/**
 * Runs an actor until the snapshot predicate returns `true`.
 *
 * Immediately stops the actor thereafter.
 *
 * @template TActor Actor logic which emits snapshots
 * @param actor An existing {@link xs.Actor}
 * @param predicate Snapshot predicate; see {@link xs.waitFor}
 * @returns The snapshot that matches the predicate
 * @see {@link https://stately.ai/docs/actors#waitfor}
 */
export function runUntilSnapshot<TActor extends AnySnapshotEmitterActor>(
  actor: TActor,
  predicate: SnapshotPredicate<TActor['logic']>,
): CurrySnapshotP2<TActor>;

export function runUntilSnapshot<TActor extends AnySnapshotEmitterActor>(
  actor?: TActor,
  predicate?: SnapshotPredicate<TActor['logic']>,
) {
  return runUntilSnapshot_(actor, predicate);
}

export function runUntilSnapshotWith(): CurrySnapshotWith;

export function runUntilSnapshotWith<TActor extends AnySnapshotEmitterActor>(
  actor: TActor,
): CurrySnapshotWithP1<TActor>;

export function runUntilSnapshotWith<TActor extends AnySnapshotEmitterActor>(
  actor: TActor,
  options: AuditionOptions,
): CurrySnapshotWithP2<TActor>;

/**
 * Runs an actor until the snapshot predicate returns `true`.
 *
 * Immediately stops the actor thereafter.
 *
 * @template TActor Actor logic which emits snapshots
 * @param actor An existing {@link xs.Actor}
 * @param options Options
 * @param predicate Snapshot predicate; see {@link xs.waitFor}
 * @returns The snapshot that matches the predicate
 * @see {@link https://stately.ai/docs/actors#waitfor}
 */

export function runUntilSnapshotWith<TActor extends AnySnapshotEmitterActor>(
  actor: TActor,
  options: AuditionOptions,
  predicate: SnapshotPredicate<TActor['logic']>,
): CurrySnapshotWithP3<TActor>;

export function runUntilSnapshotWith<TActor extends AnySnapshotEmitterActor>(
  actor?: TActor,
  options?: AuditionOptions,
  predicate?: SnapshotPredicate<TActor['logic']>,
) {
  return runUntilSnapshotWith_(actor, options, predicate);
}

export function waitForSnapshot(): CurrySnapshot;

export function waitForSnapshot<TActor extends AnySnapshotEmitterActor>(
  actor: TActor,
): CurrySnapshotP1<TActor>;

export function waitForSnapshot<TActor extends AnySnapshotEmitterActor>(
  actor: TActor,
  predicate?: SnapshotPredicate<TActor['logic']>,
): CurrySnapshotP2<TActor>;

export function waitForSnapshot<TActor extends AnySnapshotEmitterActor>(
  actor?: TActor,
  predicate?: SnapshotPredicate<TActor['logic']>,
) {
  return waitForSnapshot_(actor, predicate);
}

export function waitForSnapshotWith(): CurrySnapshotWith;

export function waitForSnapshotWith<TActor extends AnySnapshotEmitterActor>(
  actor: TActor,
): CurrySnapshotWithP1<TActor>;

export function waitForSnapshotWith<TActor extends AnySnapshotEmitterActor>(
  actor: TActor,
  options: AuditionOptions,
): CurrySnapshotWithP2<TActor>;

export function waitForSnapshotWith<TActor extends AnySnapshotEmitterActor>(
  actor: TActor,
  options: AuditionOptions,
  predicate: SnapshotPredicate<TActor['logic']>,
): CurrySnapshotWithP3<TActor>;

export function waitForSnapshotWith<TActor extends AnySnapshotEmitterActor>(
  actor?: TActor,
  options?: AuditionOptions,
  predicate?: SnapshotPredicate<TActor['logic']>,
) {
  return waitForSnapshotWith_(actor, options, predicate);
}

const untilSnapshot = <TActor extends AnySnapshotEmitterActor>(
  actor: TActor,
  options: InternalAuditionOptions,
  predicate: SnapshotPredicate<TActor['logic']>,
): Promise<xs.SnapshotFrom<TActor['logic']>> => {
  const opts = applyDefaults(options);

  const {inspector, stop, timeout} = opts;

  const inspectorObserver = xs.toObserver(inspector);

  const snapshotInspector: xs.Observer<xs.InspectionEvent> = {
    complete: inspectorObserver.complete,
    error: inspectorObserver.error,
    next: (evt) => {
      inspectorObserver.next?.(evt);

      maybePatchActorRef(evt);
    },
  };

  const maybePatchActorRef = createPatcher({
    ...opts,
    inspector: snapshotInspector,
  });

  maybePatchActorRef(actor);

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
            'TActor terminated without satisfying predicate',
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
  const currySnapshot = <TActor extends AnySnapshotEmitterActor>(
    actor?: TActor,
    predicate?: SnapshotPredicate<TActor['logic']>,
  ) => {
    if (actor) {
      if (predicate) {
        return untilSnapshot(
          actor,
          {
            stop,
          },
          predicate,
        ) as CurrySnapshotP2<TActor>;
      }

      return ((predicate?: SnapshotPredicate<TActor['logic']>) =>
        predicate
          ? currySnapshot(actor, predicate)
          : currySnapshot(actor)) as CurrySnapshotP1<TActor>;
    }

    return currySnapshot as CurrySnapshot;
  };

  return currySnapshot;
};

const createSnapshotWithFn = (stop = false) => {
  const currySnapshotWith = <TActor extends AnySnapshotEmitterActor>(
    actor?: TActor,
    options?: AuditionOptions,
    predicate?: SnapshotPredicate<TActor['logic']>,
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

        return ((predicate?: SnapshotPredicate<TActor['logic']>) => {
          return predicate
            ? currySnapshotWith(actor, options, predicate)
            : currySnapshotWith(actor, options);
        }) as CurrySnapshotWithP2<TActor>;
      }

      return ((
        options?: AuditionOptions,
        predicate?: SnapshotPredicate<TActor['logic']>,
      ) => {
        if (options) {
          return predicate
            ? currySnapshotWith(actor, options, predicate)
            : currySnapshotWith(actor, options);
        }

        return currySnapshotWith(actor);
      }) as CurrySnapshotWithP1<TActor>;
    }

    return currySnapshotWith as CurrySnapshotWith;
  };

  return currySnapshotWith;
};

const runUntilSnapshot_ = createSnapshotFn(true);

const waitForSnapshot_ = createSnapshotFn(false);

const runUntilSnapshotWith_ = createSnapshotWithFn(true);

const waitForSnapshotWith_ = createSnapshotWithFn(false);
