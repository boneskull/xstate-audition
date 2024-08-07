import * as xs from 'xstate';

import {attachActor, createActorThenable} from './actor.js';
import {applyDefaults} from './defaults.js';
import {isString} from './guard.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {type ActorThenable, type AuditionOptions} from './types.js';
import {startTimer} from './util.js';

export type CurrySpawn =
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
      target: RegExp | string,
    ) => CurrySpawnP2<Logic>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
    ) => CurrySpawnP1<Logic>)
  | (() => CurrySpawn);

export type CurrySpawnP1<Logic extends xs.AnyStateMachine> =
  | (() => CurrySpawnP1<Logic>)
  | ((target: RegExp | string) => CurrySpawnP2<Logic>);

export type CurrySpawnP2<Logic extends xs.AnyStateMachine> = ActorThenable<
  Logic,
  xs.AnyActorRef
>;

export type CurrySpawnWith =
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
      target: RegExp | string,
      options: AuditionOptions,
    ) => CurrySpawnWithP3<Logic>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
      target: RegExp | string,
    ) => CurrySpawnWithP2<Logic>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
    ) => CurrySpawnWithP1<Logic>)
  | (() => CurrySpawnWith);

export type CurrySpawnWithP1<Logic extends xs.AnyStateMachine> =
  | ((
      target: RegExp | string,
      options: AuditionOptions,
    ) => CurrySpawnWithP3<Logic>)
  | (() => CurrySpawnWithP1<Logic>)
  | ((target: RegExp | string) => CurrySpawnWithP2<Logic>);

export type CurrySpawnWithP2<Logic extends xs.AnyStateMachine> =
  | (() => CurrySpawnWithP2<Logic>)
  | ((options: AuditionOptions) => CurrySpawnWithP3<Logic>);

export type CurrySpawnWithP3<Logic extends xs.AnyStateMachine> = ActorThenable<
  Logic,
  xs.AnyActorRef
>;

type SpawnFn = <
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(
  actor: Actor,
  target: RegExp | string,
  options: AuditionOptions,
) => ActorThenable<Logic, xs.AnyActorRef>;

export function runUntilSpawn(): CurrySpawn;

export function runUntilSpawn<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurrySpawnP1<Logic>;

export function runUntilSpawn<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor, target: RegExp | string): CurrySpawnP2<Logic>;

export function runUntilSpawn<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor?: Actor, target?: RegExp | string) {
  return runUntilSpawn_(actor, target);
}

export function runUntilSpawnWith(): CurrySpawnWith;

export function runUntilSpawnWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurrySpawnWithP1<Logic>;

export function runUntilSpawnWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor, target: RegExp | string): CurrySpawnWithP2<Logic>;

export function runUntilSpawnWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(
  actor: Actor,
  target: RegExp | string,
  options: AuditionOptions,
): CurrySpawnWithP3<Logic>;

export function runUntilSpawnWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor?: Actor, target?: RegExp | string, options?: AuditionOptions) {
  return runUntilSpawnWith_(actor, target, options);
}

export function waitForSpawn(): CurrySpawn;

export function waitForSpawn<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurrySpawnP1<Logic>;

export function waitForSpawn<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor, target: RegExp | string): CurrySpawnP2<Logic>;

export function waitForSpawn<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor?: Actor, target?: RegExp | string) {
  return waitForSpawn_(actor, target);
}

export function waitForSpawnWith(): CurrySpawnWith;

export function waitForSpawnWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurrySpawnWithP1<Logic>;

export function waitForSpawnWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor, target: RegExp | string): CurrySpawnWithP2<Logic>;

export function waitForSpawnWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(
  actor: Actor,
  target: RegExp | string,
  options: AuditionOptions,
): CurrySpawnWithP3<Logic>;

export function waitForSpawnWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor?: Actor, target?: RegExp | string, options?: AuditionOptions) {
  return waitForSpawnWith_(actor, target, options);
}

const createSpawnFn = <T extends SpawnFn>(spawnFn: T, stop = false) => {
  const currySpawn = <
    Logic extends xs.AnyStateMachine,
    Actor extends xs.Actor<Logic>,
  >(
    actor?: Actor,
    target?: RegExp | string,
  ) => {
    if (actor) {
      if (target) {
        return spawnFn(actor, target, {stop});
      }
      return ((target?: RegExp | string) => {
        return target ? currySpawn(actor, target) : currySpawn(actor);
      }) as CurrySpawnP1<Logic>;
    }
    return currySpawn as CurrySpawn;
  };

  return currySpawn;
};

const createSpawnWithFn = <T extends SpawnFn>(spawnFn: T, stop = false) => {
  const currySpawnWith = <
    Logic extends xs.AnyStateMachine,
    Actor extends xs.Actor<Logic>,
  >(
    actor?: Actor,
    target?: RegExp | string,
    options?: AuditionOptions,
  ) => {
    if (actor) {
      if (target) {
        if (options) {
          return spawnFn(actor, target, {...options, stop});
        }
        return ((options?: AuditionOptions) => {
          return options
            ? currySpawnWith(actor, target, options)
            : currySpawnWith(actor, target);
        }) as CurrySpawnWithP2<Logic>;
      }
      return ((target?: RegExp | string, options?: AuditionOptions) => {
        return target
          ? currySpawnWith(actor, target, options)
          : currySpawnWith(actor, target);
      }) as CurrySpawnWithP1<Logic>;
    }
    return currySpawnWith as CurrySpawnWith;
  };

  return currySpawnWith;
};

const untilSpawn = <
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(
  actor: Actor,
  target: RegExp | string,
  options: AuditionOptions,
): ActorThenable<Logic, xs.AnyActorRef> => {
  const {inspector, stop, timeout} = applyDefaults(options);

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

const runUntilSpawn_ = createSpawnFn(untilSpawn, true);

const waitForSpawn_ = createSpawnFn(untilSpawn, false);

const runUntilSpawnWith_ = createSpawnWithFn(untilSpawn, true);

const waitForSpawnWith_ = createSpawnWithFn(untilSpawn, false);
