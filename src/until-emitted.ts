import type * as xs from 'xstate';

import {attachActor, createActorThenable} from './actor.js';
import {applyDefaults} from './defaults.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {type ActorThenable, type AuditionOptions} from './types.js';
import {DEFAULT_TIMEOUT, startTimer} from './util.js';

export type ActorEmittedTypeTuple<T extends xs.AnyStateMachine> = [
  ActorEmittedType<T>,
  ...ActorEmittedType<T>,
];

export type ActorEmittedTuple<
  T extends xs.AnyStateMachine,
  EmittedTypes extends ActorEmittedTypeTuple<T>,
> = {[K in keyof EmittedTypes]: EventFromEmitted<T, EmittedTypes[K]>};

export type ActorEmittedType<T extends xs.AnyActorLogic> =
  xs.EmittedFrom<T>['type'];

export type EventFromEmitted<
  T extends xs.AnyStateMachine,
  K extends ActorEmittedType<T>,
> = xs.ExtractEvent<xs.EmittedFrom<T>, K>;

export type CurryEmitted =
  | (() => <
      Logic extends xs.AnyStateMachine,
      Actor extends xs.Actor<Logic>,
      const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
    >(
      actor: Actor,
      events: EmittedTypes,
    ) => CurryEmittedP2<Logic, EmittedTypes>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
    ) => CurryEmittedP1<Logic>)
  | (() => CurryEmitted);

export type CurryEmittedP1<Logic extends xs.AnyStateMachine> =
  | (() => CurryEmittedP1<Logic>)
  | (<const EmittedTypes extends ActorEmittedTypeTuple<Logic>>(
      events: EmittedTypes,
    ) => CurryEmittedP2<Logic, EmittedTypes>);

export type CurryEmittedP2<
  Logic extends xs.AnyStateMachine,
  EmittedTypes extends ActorEmittedTypeTuple<Logic>,
> = ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>>;

export type CurryEmittedWith =
  | (() => <
      Logic extends xs.AnyStateMachine,
      Actor extends xs.Actor<Logic>,
      const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
    >(
      actor: Actor,
      events: EmittedTypes,
      options: AuditionOptions,
    ) => CurryEmittedWithP3<Logic, EmittedTypes>)
  | (() => <
      Logic extends xs.AnyStateMachine,
      Actor extends xs.Actor<Logic>,
      const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
    >(
      actor: Actor,
      events: EmittedTypes,
    ) => CurryEmittedWithP2<Logic, EmittedTypes>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
    ) => CurryEmittedWithP1<Logic>)
  | (() => CurryEmittedWith);

export type CurryEmittedWithP1<Logic extends xs.AnyStateMachine> =
  | (() => CurryEmittedWithP1<Logic>)
  | (<const EmittedTypes extends ActorEmittedTypeTuple<Logic>>(
      events: EmittedTypes,
      options: AuditionOptions,
    ) => CurryEmittedWithP3<Logic, EmittedTypes>)
  | (<const EmittedTypes extends ActorEmittedTypeTuple<Logic>>(
      events: EmittedTypes,
    ) => CurryEmittedWithP2<Logic, EmittedTypes>);

export type CurryEmittedWithP2<
  Logic extends xs.AnyStateMachine,
  EmittedTypes extends ActorEmittedTypeTuple<Logic>,
> =
  | (() => CurryEmittedWithP2<Logic, EmittedTypes>)
  | ((options: AuditionOptions) => CurryEmittedWithP3<Logic, EmittedTypes>);

export type CurryEmittedWithP3<
  Logic extends xs.AnyStateMachine,
  EmittedTypes extends ActorEmittedTypeTuple<Logic>,
> = ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>>;

type EmittedFn = <
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(
  actor: Actor,
  events: EmittedTypes,
  options: AuditionOptions,
) => ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>>;

export function runUntilEmitted(): CurryEmitted;

export function runUntilEmitted<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryEmittedP1<Logic>;

export function runUntilEmitted<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(actor: Actor, events: EmittedTypes): CurryEmittedP2<Logic, EmittedTypes>;

export function runUntilEmitted<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(actor?: Actor, events?: EmittedTypes) {
  return runUntilEmitted_(actor, events);
}

export function runUntilEmittedWith(): CurryEmittedWith;

export function runUntilEmittedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryEmittedWithP1<Logic>;

export function runUntilEmittedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(actor: Actor, events: EmittedTypes): CurryEmittedWithP2<Logic, EmittedTypes>;

export function runUntilEmittedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(
  actor: Actor,
  events: EmittedTypes,
  options: AuditionOptions,
): CurryEmittedWithP3<Logic, EmittedTypes>;

export function runUntilEmittedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(actor?: Actor, events?: EmittedTypes, options?: AuditionOptions) {
  return runUntilEmittedWith_(actor, events, options);
}

/**
 * Waits for an actor to emit one or more events (in order).
 *
 * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
 * may be sent to the actor.
 *
 * @param events One or more _event names_ (the `type` field) to wait for (in
 *   order)
 * @param actor An existing {@link xs.Actor}
 * @returns An {@link ActorThenable} which fulfills with the matching events
 *   (assuming they all occurred in order)
 */
export function waitForEmitted(): CurryEmitted;

export function waitForEmitted<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryEmittedP1<Logic>;

export function waitForEmitted<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(actor: Actor, events: EmittedTypes): CurryEmittedP2<Logic, EmittedTypes>;

export function waitForEmitted<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(actor?: Actor, events?: EmittedTypes) {
  return waitForEmitted_(actor, events);
}

export function waitForEmittedWith(): CurryEmittedWith;

export function waitForEmittedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryEmittedWithP1<Logic>;

export function waitForEmittedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(actor: Actor, events: EmittedTypes): CurryEmittedWithP2<Logic, EmittedTypes>;

export function waitForEmittedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(
  actor: Actor,
  events: EmittedTypes,
  options: AuditionOptions,
): CurryEmittedWithP3<Logic, EmittedTypes>;

export function waitForEmittedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(actor?: Actor, events?: EmittedTypes, options?: AuditionOptions) {
  return waitForEmittedWith_(actor, events, options);
}

const createEmittedFn = <T extends EmittedFn>(emittedFn: T, stop = false) => {
  const curryEmitted = <
    Logic extends xs.AnyStateMachine,
    Actor extends xs.Actor<Logic>,
    const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
  >(
    actor?: Actor,
    events?: EmittedTypes,
  ) => {
    if (actor) {
      if (events) {
        return emittedFn(actor, events, {stop}) as CurryEmittedP2<
          Logic,
          EmittedTypes
        >;
      }
      return ((events?: EmittedTypes) =>
        events
          ? curryEmitted(actor, events)
          : curryEmitted(actor)) as CurryEmittedP1<Logic>;
    }
    return curryEmitted as CurryEmitted;
  };

  return curryEmitted;
};

const createEmittedWithFn = <T extends EmittedFn>(
  emittedWithFn: T,
  stop = false,
) => {
  const curryEmittedWith = <
    Logic extends xs.AnyStateMachine,
    Actor extends xs.Actor<Logic>,
    const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
  >(
    actor?: Actor,
    events?: EmittedTypes,
    options?: AuditionOptions,
  ) => {
    if (actor) {
      if (events) {
        if (options) {
          return emittedWithFn(actor, events, {
            ...options,
            stop,
          });
        }
        return ((options?: AuditionOptions) => {
          return options
            ? curryEmittedWith(actor, events, options)
            : curryEmittedWith(actor, events);
        }) as CurryEmittedWithP2<Logic, EmittedTypes>;
      }
      return ((events?: EmittedTypes, options?: AuditionOptions) => {
        if (events) {
          return options
            ? curryEmittedWith(actor, events, options)
            : curryEmittedWith(actor, events);
        }
        return curryEmittedWith(actor);
      }) as CurryEmittedWithP1<Logic>;
    }
    return curryEmittedWith as CurryEmittedWith;
  };

  return curryEmittedWith;
};

const untilEmitted = <
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(
  actor: Actor,
  events: EmittedTypes,
  options: AuditionOptions = {},
): ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>> => {
  const {stop = false, timeout = DEFAULT_TIMEOUT} = applyDefaults(options);

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<ActorEmittedTuple<Logic, EmittedTypes>>();

  /**
   * This listener looks for each desired event in order, recursively creating &
   * destroying subscriptions as it does so. Each event is pushed to
   * {@link emitted}, and when all have been accounted for, {@link promise} is
   * resolved with the array of events.
   */
  const subscribe = (type: EmittedTypes[number]): xs.Subscription =>
    actor.on(type, (event) => {
      eventSubscription?.unsubscribe();
      if (abortController.signal.aborted) {
        return;
      }
      emitted.push(event);

      const next = expectedEventQueue.shift();

      if (next) {
        eventSubscription = subscribe(next);
      } else {
        if (stop) {
          actor.stop();
        }
        resolve(emitted);
      }
    });

  const expectedEventQueue = [...events];

  if (!expectedEventQueue.length) {
    throw new TypeError('Expected one or more event types');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const emitted: ActorEmittedTuple<Logic, EmittedTypes> = [] as any;

  if (timeout !== Infinity) {
    startTimer(
      abortController,
      timeout,
      `Actor did not complete in ${timeout}ms`,
    );
  }

  actor = attachActor(actor, options);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  let eventSubscription = subscribe(expectedEventQueue.shift()!);

  const snapshotSubscription = actor.subscribe({error: reject});

  void promise.finally(() => {
    snapshotSubscription.unsubscribe();
  });
  actor.start();
  return createActorThenable(actor, promise);
};

const runUntilEmitted_ = createEmittedFn(untilEmitted, true);

const runUntilEmittedWith_ = createEmittedWithFn(untilEmitted, true);

const waitForEmitted_ = createEmittedFn(untilEmitted, false);

const waitForEmittedWith_ = createEmittedWithFn(untilEmitted, false);
