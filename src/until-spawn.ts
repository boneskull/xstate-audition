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

export type CurrySpawn =
  | (() => <Actor extends AnyStateMachineActor>(
      actor: Actor,
      target: RegExp | string,
    ) => CurrySpawnP2)
  | (() => <Actor extends AnyStateMachineActor>(
      actor: Actor,
    ) => CurrySpawnP1<Actor>)
  | (() => CurrySpawn);

export type CurrySpawnP1<Actor extends AnyStateMachineActor> =
  | (() => CurrySpawnP1<Actor>)
  | ((target: RegExp | string) => CurrySpawnP2);

export type CurrySpawnP2 = Promise<xs.AnyActorRef>;

export type CurrySpawnWith =
  | (() => <Actor extends AnyStateMachineActor>(
      actor: Actor,
      options: AuditionOptions,
      target: RegExp | string,
    ) => CurrySpawnWithP3)
  | (() => <Actor extends AnyStateMachineActor>(
      actor: Actor,
      options: AuditionOptions,
    ) => CurrySpawnWithP2<Actor>)
  | (() => <Actor extends AnyStateMachineActor>(
      actor: Actor,
    ) => CurrySpawnWithP1<Actor>)
  | (() => CurrySpawnWith);

export type CurrySpawnWithP1<Actor extends AnyStateMachineActor> =
  | (() => CurrySpawnWithP1<Actor>)
  | ((options: AuditionOptions) => CurrySpawnWithP2<Actor>)
  | ((options: AuditionOptions, target: RegExp | string) => CurrySpawnWithP3);

export type CurrySpawnWithP2<Actor extends AnyStateMachineActor> =
  | (() => CurrySpawnWithP2<Actor>)
  | ((target: RegExp | string) => CurrySpawnWithP3);

export type CurrySpawnWithP3 = Promise<xs.AnyActorRef>;

export function runUntilSpawn(): CurrySpawn;

export function runUntilSpawn<Actor extends AnyStateMachineActor>(
  actor: Actor,
): CurrySpawnP1<Actor>;

export function runUntilSpawn<Actor extends AnyStateMachineActor>(
  actor: Actor,
  target: RegExp | string,
): CurrySpawnP2;

export function runUntilSpawn<Actor extends AnyStateMachineActor>(
  actor?: Actor,
  target?: RegExp | string,
) {
  return runUntilSpawn_(actor, target);
}

export function runUntilSpawnWith(): CurrySpawnWith;

export function runUntilSpawnWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
): CurrySpawnWithP1<Actor>;

export function runUntilSpawnWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: AuditionOptions,
): CurrySpawnWithP2<Actor>;

export function runUntilSpawnWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: AuditionOptions,
  target: RegExp | string,
): CurrySpawnWithP3;

export function runUntilSpawnWith<Actor extends AnyStateMachineActor>(
  actor?: Actor,
  options?: AuditionOptions,
  target?: RegExp | string,
) {
  return runUntilSpawnWith_(actor, options, target);
}

export function waitForSpawn(): CurrySpawn;

export function waitForSpawn<Actor extends AnyStateMachineActor>(
  actor: Actor,
): CurrySpawnP1<Actor>;

export function waitForSpawn<Actor extends AnyStateMachineActor>(
  actor: Actor,
  target: RegExp | string,
): CurrySpawnP2;

export function waitForSpawn<Actor extends AnyStateMachineActor>(
  actor?: Actor,
  target?: RegExp | string,
) {
  return waitForSpawn_(actor, target);
}

export function waitForSpawnWith(): CurrySpawnWith;

export function waitForSpawnWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
): CurrySpawnWithP1<Actor>;

export function waitForSpawnWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: AuditionOptions,
): CurrySpawnWithP2<Actor>;

export function waitForSpawnWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: AuditionOptions,
  target: RegExp | string,
): CurrySpawnWithP3;

export function waitForSpawnWith<Actor extends AnyStateMachineActor>(
  actor?: Actor,
  options?: AuditionOptions,
  target?: RegExp | string,
) {
  return waitForSpawnWith_(actor, options, target);
}

const createSpawnFn = (stop = false) => {
  const currySpawn = <Actor extends AnyStateMachineActor>(
    actor?: Actor,
    target?: RegExp | string,
  ) => {
    if (actor) {
      if (target) {
        return untilSpawn(actor, {stop}, target);
      }

      return ((target?: RegExp | string) => {
        return target ? currySpawn(actor, target) : currySpawn(actor);
      }) as CurrySpawnP1<Actor>;
    }

    return currySpawn as CurrySpawn;
  };

  return currySpawn;
};

const createSpawnWithFn = (stop = false) => {
  const currySpawnWith = <Actor extends AnyStateMachineActor>(
    actor?: Actor,
    options?: AuditionOptions,
    target?: RegExp | string,
  ) => {
    if (actor) {
      if (options) {
        if (target) {
          return untilSpawn(actor, {...options, stop}, target);
        }

        return ((target?: RegExp | string) => {
          return target
            ? currySpawnWith(actor, options, target)
            : currySpawnWith(actor, options);
        }) as CurrySpawnWithP2<Actor>;
      }

      return ((options?: AuditionOptions, target?: RegExp | string) => {
        return options
          ? currySpawnWith(actor, options, target)
          : currySpawnWith(actor, options);
      }) as CurrySpawnWithP1<Actor>;
    }

    return currySpawnWith as CurrySpawnWith;
  };

  return currySpawnWith;
};

const untilSpawn = <Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: InternalAuditionOptions,
  target: RegExp | string,
): Promise<xs.AnyActorRef> => {
  const opts = applyDefaults(options);

  const {inspector, logger, stop, timeout} = opts;

  const inspectorObserver = xs.toObserver(inspector);

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<xs.AnyActorRef>();

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
        actor.stop();

        return;
      }

      if (predicate(evt.actorRef.id)) {
        didSpawn = true;
        resolve(evt.actorRef);
      }
    },
  };

  attachActor(actor, {...opts, inspector: spawnInspector});
  seenActors.add(actor);
  startTimer(
    abortController,
    timeout,
    `Failed to detect a spawned actor matching ${target} in ${timeout}ms`,
  );
  actor.start();

  return promise.finally(() => {
    if (stop) {
      actor.stop();
    }
  });
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
