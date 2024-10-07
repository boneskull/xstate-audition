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
import {isActorRef} from './util.js';

export type SpawnTarget = RegExp | string;

export type CurrySpawn = (() => CurrySpawn) &
  (<TLogic extends xs.AnyActorLogic>(
    actor: AnyStateMachineActor,
  ) => CurrySpawnP1<TLogic>) &
  (<TLogic extends xs.AnyActorLogic>(
    actor: AnyStateMachineActor,
    target: SpawnTarget,
  ) => CurrySpawnP2<TLogic>);

export type CurrySpawnP1<TLogic extends xs.AnyActorLogic> =
  (() => CurrySpawnP1<TLogic>) &
    ((target: SpawnTarget) => CurrySpawnP2<TLogic>);

export type CurrySpawnP2<TLogic extends xs.AnyActorLogic> = Promise<
  xs.ActorRefFrom<TLogic>
>;

export type CurrySpawnWith = (() => CurrySpawnWith) &
  (<TLogic extends xs.AnyActorLogic>(
    actor: AnyStateMachineActor,
  ) => CurrySpawnWithP1<TLogic>) &
  (<TLogic extends xs.AnyActorLogic>(
    actor: AnyStateMachineActor,
    options: AuditionOptions,
  ) => CurrySpawnWithP2<TLogic>) &
  (<TLogic extends xs.AnyActorLogic>(
    actor: AnyStateMachineActor,
    options: AuditionOptions,
    target: SpawnTarget,
  ) => CurrySpawnWithP3<TLogic>);

export type CurrySpawnWithP1<TLogic extends xs.AnyActorLogic> =
  (() => CurrySpawnWithP1<TLogic>) &
    ((options: AuditionOptions) => CurrySpawnWithP2<TLogic>) &
    ((
      options: AuditionOptions,
      target: SpawnTarget,
    ) => CurrySpawnWithP3<TLogic>);

export type CurrySpawnWithP2<TLogic extends xs.AnyActorLogic> =
  (() => CurrySpawnWithP2<TLogic>) &
    ((target: SpawnTarget) => CurrySpawnWithP3<TLogic>);

export type CurrySpawnWithP3<TLogic extends xs.AnyActorLogic> = Promise<
  xs.ActorRefFrom<TLogic>
>;

export function runUntilSpawn<TLogic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
  target: SpawnTarget,
): CurrySpawnP2<TLogic>;

export function runUntilSpawn<TLogic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
): CurrySpawnP1<TLogic>;

export function runUntilSpawn(): CurrySpawn;

export function runUntilSpawn<TLogic extends xs.AnyActorLogic>(
  actor?: AnyStateMachineActor,
  target?: SpawnTarget,
) {
  return runUntilSpawn_<TLogic>(actor, target);
}

export function runUntilSpawnWith(): CurrySpawnWith;

export function runUntilSpawnWith<TLogic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
): CurrySpawnWithP1<TLogic>;

export function runUntilSpawnWith<TLogic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
  options: AuditionOptions,
): CurrySpawnWithP2<TLogic>;

export function runUntilSpawnWith<TLogic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
  options: AuditionOptions,
  target: SpawnTarget,
): CurrySpawnWithP3<TLogic>;

export function runUntilSpawnWith<TLogic extends xs.AnyActorLogic>(
  actor?: AnyStateMachineActor,
  options?: AuditionOptions,
  target?: SpawnTarget,
) {
  return runUntilSpawnWith_<TLogic>(actor, options, target);
}

export function waitForSpawn<TLogic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
  target: SpawnTarget,
): CurrySpawnP2<TLogic>;

export function waitForSpawn<TLogic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
): CurrySpawnP1<TLogic>;

export function waitForSpawn(): CurrySpawn;

export function waitForSpawn<TLogic extends xs.AnyActorLogic>(
  actor?: AnyStateMachineActor,
  target?: SpawnTarget,
) {
  return waitForSpawn_<TLogic>(actor, target);
}

export function waitForSpawnWith<
  TLogic extends xs.AnyActorLogic = xs.AnyActorLogic,
>(
  actor: AnyStateMachineActor,
  options: AuditionOptions,
  target: SpawnTarget,
): CurrySpawnWithP3<TLogic>;

export function waitForSpawnWith<
  TLogic extends xs.AnyActorLogic = xs.AnyActorLogic,
>(
  actor: AnyStateMachineActor,
  options: AuditionOptions,
): CurrySpawnWithP2<TLogic>;

export function waitForSpawnWith<
  TLogic extends xs.AnyActorLogic = xs.AnyActorLogic,
>(actor: AnyStateMachineActor): CurrySpawnWithP1<TLogic>;

export function waitForSpawnWith(): CurrySpawnWith;

export function waitForSpawnWith<
  TLogic extends xs.AnyActorLogic = xs.AnyActorLogic,
>(
  actor?: AnyStateMachineActor,
  options?: AuditionOptions,
  target?: SpawnTarget,
) {
  return waitForSpawnWith_<TLogic>(actor, options, target);
}

const createSpawnFn = (stop = false) => {
  const currySpawn = <TLogic extends xs.AnyActorLogic>(
    actor?: AnyStateMachineActor,
    target?: SpawnTarget,
  ) => {
    if (actor) {
      if (target) {
        return untilSpawn(actor, {stop}, target) as CurrySpawnP2<TLogic>;
      }

      return ((target?: SpawnTarget) => {
        return target ? currySpawn(actor, target) : currySpawn(actor);
      }) as CurrySpawnP1<TLogic>;
    }

    return currySpawn as CurrySpawn;
  };

  return currySpawn;
};

const createSpawnWithFn = (stop = false) => {
  const currySpawnWith = <TLogic extends xs.AnyActorLogic>(
    actor?: AnyStateMachineActor,
    options?: AuditionOptions,
    target?: SpawnTarget,
  ) => {
    if (actor) {
      if (options) {
        if (target) {
          return untilSpawn(
            actor,
            {...options, stop},
            target,
          ) as CurrySpawnWithP3<TLogic>;
        }

        return ((target?: SpawnTarget) => {
          return target
            ? currySpawnWith(actor, options, target)
            : currySpawnWith(actor, options);
        }) as CurrySpawnWithP2<TLogic>;
      }

      return ((options?: AuditionOptions, target?: SpawnTarget) => {
        return options
          ? currySpawnWith(actor, options, target)
          : currySpawnWith(actor, options);
      }) as CurrySpawnWithP1<TLogic>;
    }

    return currySpawnWith as CurrySpawnWith;
  };

  return currySpawnWith;
};

const untilSpawn = async <TLogic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
  options: InternalAuditionOptions,
  target: SpawnTarget,
): Promise<xs.ActorRefFrom<TLogic>> => {
  const opts = applyDefaults(options);

  const {inspector, stop, timeout} = opts;

  const inspectorObserver = xs.toObserver(inspector);

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<xs.ActorRefFrom<TLogic>>();

  const predicate =
    typeof target === 'string'
      ? (id: string) => id === target
      : (id: string) => target.test(id);

  let didSpawn = false;

  const spawnInspector: xs.Observer<xs.InspectionEvent> = {
    complete: () => {
      inspectorObserver.complete?.();

      if (abortController.signal.aborted) {
        return;
      }

      if (!didSpawn) {
        // TODO better representation of the target, since it's not always a string
        reject(
          new Error(`Actor completed before spawning actor matching ${target}`),
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
    next: (evt) => {
      inspectorObserver.next?.(evt);

      maybePatchActorRef(evt);

      if (abortController.signal.aborted) {
        return;
      }

      if (isActorRef(evt.actorRef) && predicate(evt.actorRef.id)) {
        didSpawn = true;
        resolve(evt.actorRef as xs.ActorRefFrom<TLogic>);
      }
    },
  };

  const maybePatchActorRef = createPatcher({
    ...opts,
    inspector: spawnInspector,
  });

  maybePatchActorRef(actor);

  startTimer(
    actor,
    abortController,
    timeout,
    `Failed to detect a spawned actor matching ${target} in ${timeout}ms`,
  );
  actor.start();

  try {
    return await promise;
  } finally {
    if (stop) {
      actor.stop();
    }
  }
};

/**
 * @see {@link runUntilSpawn}
 */
const runUntilSpawn_ = createSpawnFn(true);

/**
 * @see {@link waitForSpawn}
 */
const waitForSpawn_ = createSpawnFn(false);

/**
 * @see {@link runUntilSpawnWith}
 */
const runUntilSpawnWith_ = createSpawnWithFn(true);

/**
 * @see {@link waitForSpawnWith}
 */
const waitForSpawnWith_ = createSpawnWithFn(false);
