import type * as xs from 'xstate';

import {attachActor, createActorThenable} from './actor.js';
import {
  type ActorEmittedTuple,
  type ActorEmittedTypeTuple,
  type ActorLogicWithOutput,
  type ActorThenable,
  type AuditionOptions,
} from './types.js';
import {
  applyDefaults,
  createAbortablePromiseKit,
  DEFAULT_TIMEOUT,
  startTimer,
} from './util.js';

const untilEmitted = <
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
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

export function runUntilEmitted(): <
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(
  actor: Actor,
  events: EmittedTypes,
) => ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>>;

export function runUntilEmitted<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(
  actor: Actor,
): <const EmittedTypes extends ActorEmittedTypeTuple<Logic>>(
  events: EmittedTypes,
) => ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>>;

export function runUntilEmitted<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(
  actor: Actor,
  events: EmittedTypes,
): ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>>;

export function runUntilEmitted<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(actor?: Actor, events?: EmittedTypes) {
  if (actor) {
    if (events) {
      return untilEmitted(actor, events, {stop: true});
    }
    return (events: EmittedTypes) => untilEmitted(actor, events, {stop: true});
  }
  return (actor: Actor, events: EmittedTypes) =>
    untilEmitted(actor, events, {stop: true});
}

export function runUntilEmittedWith(this: void): typeof runUntilEmittedWith;

export function runUntilEmittedWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(
  actor: Actor,
): <const EmittedTypes extends ActorEmittedTypeTuple<Logic>>(
  events: EmittedTypes,
) => (
  options: AuditionOptions,
) => ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>>;

export function runUntilEmittedWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(
  actor: Actor,
  events: EmittedTypes,
): (
  options: AuditionOptions,
) => ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>>;

export function runUntilEmittedWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(
  actor: Actor,
  events: EmittedTypes,
): () => (
  options: AuditionOptions,
) => ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>>;

export function runUntilEmittedWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(
  actor: Actor,
): <const EmittedTypes extends ActorEmittedTypeTuple<Logic>>(
  events: EmittedTypes,
  options: AuditionOptions,
) => ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>>;

export function runUntilEmittedWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
>(
  actor: Actor,
): () => <const EmittedTypes extends ActorEmittedTypeTuple<Logic>>(
  events: EmittedTypes,
  options: AuditionOptions,
) => ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>>;

export function runUntilEmittedWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(
  actor: Actor,
  events: EmittedTypes,
  options: AuditionOptions,
): ActorThenable<Logic, ActorEmittedTuple<Logic, EmittedTypes>>;

export function runUntilEmittedWith<
  Actor extends xs.Actor<Logic>,
  Logic extends xs.AnyStateMachine,
  const EmittedTypes extends ActorEmittedTypeTuple<Logic>,
>(actor?: Actor, events?: EmittedTypes, options?: AuditionOptions) {
  if (actor) {
    if (events) {
      if (options) {
        return untilEmitted(actor, events, {...options, stop: true});
      }
      return (options?: AuditionOptions) => {
        return options
          ? runUntilEmittedWith(actor, events, options)
          : runUntilEmittedWith(actor, events);
      };
    }
    return (events?: EmittedTypes, options?: AuditionOptions) => {
      if (events) {
        return options
          ? runUntilEmittedWith(actor, events, options)
          : runUntilEmittedWith(actor, events);
      }
      return runUntilEmittedWith(actor);
    };
  }
  return runUntilEmittedWith;
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
export function waitForEmitted<
  T extends ActorLogicWithOutput,
  const EventTypes extends ActorEmittedTypeTuple<T>,
>(
  actor: xs.Actor<T>,
  events: EventTypes,
): ActorThenable<T, ActorEmittedTuple<T, EventTypes>> {
  return untilEmitted(actor, events, {stop: false});
}

export function waitForEmittedWith<
  T extends ActorLogicWithOutput,
  const EventTypes extends ActorEmittedTypeTuple<T>,
>(
  actor: xs.Actor<T>,
  events: EventTypes,
  options: AuditionOptions,
): ActorThenable<T, ActorEmittedTuple<T, EventTypes>> {
  return untilEmitted(actor, events, {...options, stop: false});
}
