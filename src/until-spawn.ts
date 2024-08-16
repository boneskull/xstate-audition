import * as xs from 'xstate';

import {attachActor} from './actor.js';
import {applyDefaults} from './defaults.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {startTimer} from './timer.js';
import {
  type AnyStateMachineActor,
  type AuditionOptions,
  type InternalAuditionOptions,
} from './types.js';
import {isString} from './util.js';

export type CurrySpawn = (() => CurrySpawn) &
  (<Logic extends xs.AnyActorLogic>(
    actor: AnyStateMachineActor,
    target: RegExp | string,
  ) => CurrySpawnP2<Logic>) &
  (<Logic extends xs.AnyActorLogic>(
    actor: AnyStateMachineActor,
  ) => CurrySpawnP1<Logic>);

export type CurrySpawnP1<Logic extends xs.AnyActorLogic> =
  (() => CurrySpawnP1<Logic>) &
    ((target: RegExp | string) => CurrySpawnP2<Logic>);

export type CurrySpawnP2<Logic extends xs.AnyActorLogic> = Promise<
  xs.ActorRefFrom<Logic>
>;

export type CurrySpawnWith = (() => CurrySpawnWith) &
  (<Logic extends xs.AnyActorLogic>(
    actor: AnyStateMachineActor,
    options: AuditionOptions,
    target: RegExp | string,
  ) => CurrySpawnWithP3<Logic>) &
  (<Logic extends xs.AnyActorLogic>(
    actor: AnyStateMachineActor,
    options: AuditionOptions,
  ) => CurrySpawnWithP2<Logic>) &
  (<Logic extends xs.AnyActorLogic>(
    actor: AnyStateMachineActor,
  ) => CurrySpawnWithP1<Logic>);

export type CurrySpawnWithP1<Logic extends xs.AnyActorLogic> = ((
  options: AuditionOptions,
  target: RegExp | string,
) => CurrySpawnWithP3<Logic>) &
  (() => CurrySpawnWithP1<Logic>) &
  ((options: AuditionOptions) => CurrySpawnWithP2<Logic>);

export type CurrySpawnWithP2<Logic extends xs.AnyActorLogic> =
  (() => CurrySpawnWithP2<Logic>) &
    ((target: RegExp | string) => CurrySpawnWithP3<Logic>);

export type CurrySpawnWithP3<Logic extends xs.AnyActorLogic> = Promise<
  xs.ActorRefFrom<Logic>
>;

export function runUntilSpawn<Logic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
  target: RegExp | string,
): CurrySpawnP2<Logic>;

export function runUntilSpawn<Logic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
): CurrySpawnP1<Logic>;

export function runUntilSpawn(): CurrySpawn;

export function runUntilSpawn<Logic extends xs.AnyActorLogic>(
  actor?: AnyStateMachineActor,
  target?: RegExp | string,
) {
  return runUntilSpawn_<Logic>(actor, target);
}

export function runUntilSpawnWith(): CurrySpawnWith;

export function runUntilSpawnWith<Logic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
): CurrySpawnWithP1<Logic>;

export function runUntilSpawnWith<Logic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
  options: AuditionOptions,
): CurrySpawnWithP2<Logic>;

export function runUntilSpawnWith<Logic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
  options: AuditionOptions,
  target: RegExp | string,
): CurrySpawnWithP3<Logic>;

export function runUntilSpawnWith<Logic extends xs.AnyActorLogic>(
  actor?: AnyStateMachineActor,
  options?: AuditionOptions,
  target?: RegExp | string,
) {
  return runUntilSpawnWith_<Logic>(actor, options, target);
}

export function waitForSpawn<Logic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
  target: RegExp | string,
): CurrySpawnP2<Logic>;

export function waitForSpawn<Logic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
): CurrySpawnP1<Logic>;

export function waitForSpawn(): CurrySpawn;

export function waitForSpawn<Logic extends xs.AnyActorLogic>(
  actor?: AnyStateMachineActor,
  target?: RegExp | string,
) {
  return waitForSpawn_<Logic>(actor, target);
}

export function waitForSpawnWith<
  Logic extends xs.AnyActorLogic = xs.AnyActorLogic,
>(
  actor: AnyStateMachineActor,
  options: AuditionOptions,
  target: RegExp | string,
): CurrySpawnWithP3<Logic>;

export function waitForSpawnWith<
  Logic extends xs.AnyActorLogic = xs.AnyActorLogic,
>(
  actor: AnyStateMachineActor,
  options: AuditionOptions,
): CurrySpawnWithP2<Logic>;

export function waitForSpawnWith<
  Logic extends xs.AnyActorLogic = xs.AnyActorLogic,
>(actor: AnyStateMachineActor): CurrySpawnWithP1<Logic>;

export function waitForSpawnWith(): CurrySpawnWith;

export function waitForSpawnWith<
  Logic extends xs.AnyActorLogic = xs.AnyActorLogic,
>(
  actor?: AnyStateMachineActor,
  options?: AuditionOptions,
  target?: RegExp | string,
) {
  return waitForSpawnWith_<Logic>(actor, options, target);
}

const createSpawnFn = (stop = false) => {
  const currySpawn = <Logic extends xs.AnyActorLogic>(
    actor?: AnyStateMachineActor,
    target?: RegExp | string,
  ) => {
    if (actor) {
      if (target) {
        return untilSpawn(actor, {stop}, target) as CurrySpawnP2<Logic>;
      }

      return ((target?: RegExp | string) => {
        return target ? currySpawn(actor, target) : currySpawn(actor);
      }) as CurrySpawnP1<Logic>;
    }

    return currySpawn as CurrySpawn;
  };

  return currySpawn;
};

const createSpawnWithFn = (stop = false) => {
  const currySpawnWith = <Logic extends xs.AnyActorLogic>(
    actor?: AnyStateMachineActor,
    options?: AuditionOptions,
    target?: RegExp | string,
  ) => {
    if (actor) {
      if (options) {
        if (target) {
          return untilSpawn(
            actor,
            {...options, stop},
            target,
          ) as CurrySpawnWithP3<Logic>;
        }

        return ((target?: RegExp | string) => {
          return target
            ? currySpawnWith(actor, options, target)
            : currySpawnWith(actor, options);
        }) as CurrySpawnWithP2<Logic>;
      }

      return ((options?: AuditionOptions, target?: RegExp | string) => {
        return options
          ? currySpawnWith(actor, options, target)
          : currySpawnWith(actor, options);
      }) as CurrySpawnWithP1<Logic>;
    }

    return currySpawnWith as CurrySpawnWith;
  };

  return currySpawnWith;
};

const untilSpawn = async <Logic extends xs.AnyActorLogic>(
  actor: AnyStateMachineActor,
  options: InternalAuditionOptions,
  target: RegExp | string,
): Promise<xs.ActorRefFrom<Logic>> => {
  const opts = applyDefaults(options);

  const {inspector, logger, stop, timeout} = opts;

  const inspectorObserver = xs.toObserver(inspector);

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<xs.ActorRefFrom<Logic>>();

  const predicate = isString(target)
    ? (id: string) => id === target
    : (id: string) => target.test(id);

  let didSpawn = false;

  const seenActors: WeakSet<xs.AnyActorRef> = new WeakSet();

  const spawnInspector: xs.Observer<xs.InspectionEvent> = {
    complete: () => {
      inspectorObserver.complete?.();

      if (abortController.signal.aborted) {
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

      if (abortController.signal.aborted) {
        return;
      }

      reject(err);
    },
    next: (evt) => {
      inspectorObserver.next?.(evt);

      if (!seenActors.has(evt.actorRef)) {
        attachActor(evt.actorRef, {logger});
        seenActors.add(evt.actorRef);
      }

      if (abortController.signal.aborted) {
        return;
      }

      if (predicate(evt.actorRef.id)) {
        didSpawn = true;
        resolve(evt.actorRef as xs.ActorRefFrom<Logic>);
      }
    },
  };

  attachActor(actor, {...opts, inspector: spawnInspector});
  seenActors.add(actor);
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
