import {curry} from 'fnts';
import * as xs from 'xstate';

import {attachActor, createActorThenable} from './actor.js';
import {isString} from './guard.js';
import {
  type ActorEventTuple,
  type ActorEventTypeTuple,
  type ActorLogicWithOutput,
  type ActorThenable,
  type AuditionOptions,
  type EventFromEventType,
} from './types.js';
import {
  applyDefaults,
  createAbortablePromiseKit,
  head,
  startTimer,
} from './util.js';

const untilEventSent = <
  Ref extends xs.ActorRefFrom<xs.AnyActorLogic>,
  Logic extends xs.ActorLogicFrom<Ref>,
  const EventTypes extends ActorEventTypeTuple<Logic>,
>(
  actor: Ref,
  events: EventTypes,
  targetId?: RegExp | string,
  options: AuditionOptions = {},
): ActorThenable<Logic, ActorEventTuple<Logic, EventTypes>> => {
  const {id} = actor;
  const {inspector, stop, timeout} = applyDefaults(options);
  const {
    abortController: ac,
    promise,
    reject,
    resolve,
  } = createAbortablePromiseKit<ActorEventTuple<Logic, EventTypes>>();
  const inspectorObserver = xs.toObserver(inspector);

  if (timeout !== Infinity) {
    startTimer(ac, timeout, `Actor did not complete in ${timeout}ms`);
  }

  // targetId may be an object with an `id` field (maybe an `ActorRef`) or a string or undefined.
  // normalize it to a string or undefined.
  const target =
    targetId &&
    (isString(targetId)
      ? targetId
      : typeof targetId === 'object'
        ? targetId.id
        : undefined);

  /**
   * If we have a `target` actor ID, this asserts a given `ActorRef`'s `id`
   * matches the target.
   */
  const matchesTarget: (actorRef?: xs.AnyActorRef) => boolean = target
    ? (actorRef) => actorRef?.id === target
    : () => false;

  /**
   * Type guard for an `@xstate.event` inspection event originating from the
   * source actor.
   *
   * @param evt Any inspection event
   * @param type An expected event type
   * @returns `true` if the event matches the expected type and was sent/emitted
   *   from the actor with matching `id`
   */
  const matchesEventFromActor = (
    evt: xs.InspectionEvent,
    type: EventTypes[number],
  ): evt is xs.InspectedEventEvent =>
    evt.type === '@xstate.event' &&
    type === evt.event.type &&
    evt.sourceRef?.id === id;

  const eventSentInspector: xs.Observer<xs.InspectionEvent> = {
    complete: () => {
      inspectorObserver.complete?.();
      if (ac.signal.aborted) {
        return;
      }
      if (expectedEventQueue.length) {
        reject(
          new Error(
            `Event(s) not sent nor emitted before actor completed: ${expectedEventQueue.join(', ')}`,
          ),
        );
      }
    },
    error: (err) => {
      inspectorObserver.error?.(err);
      reject(err);
    },
    next: (evt: xs.InspectionEvent) => {
      inspectorObserver.next?.(evt);
      if (ac.signal.aborted) {
        return;
      }
      if (expectedEventQueue.length) {
        const type = head(expectedEventQueue);
        if (matchesEventFromActor(evt, type)) {
          // in this type of event, the `actorRef` is a target actor and the `sourceRef` is a source
          if (!matchesTarget(evt.actorRef)) {
            return;
          }
          emitted.push(evt.event as EventFromEventType<T, typeof type>);
          expectedEventQueue.shift();
          if (!expectedEventQueue.length) {
            resolve(emitted);
            if (stop) {
              actor.stop();
            }
          }
        }
      }
    },
  };

  actor = attachActor(actor, {...options, inspector: eventSentInspector});

  const expectedEventQueue = [...events];
  if (!expectedEventQueue.length) {
    throw new TypeError('Expected one or more event types');
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const emitted: ActorEventTuple<Logic, EventTypes> = [] as any;

  actor.start();
  return createActorThenable(actor, promise);
};

/**
 * Runs an actor until it sends one or more events (in order).
 *
 * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
 * may be sent to the actor.
 *
 * @param actor An existing {@link Actor}
 * @param events One or more _event names_ (the `type` field) to wait for (in
 *   order)
 * @returns An {@link ActorThenable} which fulfills with the matching events
 *   (assuming they all occurred in order)
 */
const _runUntilEventSent = <
  T extends ActorLogicWithOutput,
  const EventTypes extends ActorEventTypeTuple<T>,
>(
  actor: xs.Actor<T>,
  events: EventTypes,
): ActorThenable<T, ActorEventTuple<T, EventTypes>> => {
  return untilEventSent(actor, events, {stop: true});
};

/**
 * Runs an actor until it sends one or more events (in order), with an optional
 * target actor.
 *
 * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
 * may be sent to the actor.
 *
 * @param actor An existing {@link Actor}
 * @param events One or more _event names_ (the `type` field) to wait for (in
 *   order)
 * @param options Options
 * @returns An {@link ActorThenable} which fulfills with the matching events
 *   (assuming they all occurred in order)
 */
const _runUntilEventSentWith = <
  T extends ActorLogicWithOutput,
  const EventTypes extends ActorEventTypeTuple<T>,
>(
  actor: xs.Actor<T>,
  events: EventTypes,
  options: AuditionOptions,
): ActorThenable<T, ActorEventTuple<T, EventTypes>> => {
  return untilEventSent(actor, events, {...options, stop: true});
};

const _waitForEventSent = <
  T extends ActorLogicWithOutput,
  const EventTypes extends ActorEventTypeTuple<T>,
>(
  actor: xs.Actor<T>,
  events: EventTypes,
): ActorThenable<T, ActorEventTuple<T, EventTypes>> => {
  return untilEventSent(actor, events, {stop: false});
};

const _waitForEventSentWith = <
  T extends ActorLogicWithOutput,
  const EventTypes extends ActorEventTypeTuple<T>,
>(
  actor: xs.Actor<T>,
  events: EventTypes,
  options: AuditionOptions,
): ActorThenable<T, ActorEventTuple<T, EventTypes>> => {
  return untilEventSent(actor, events, {...options, stop: false});
};

const _waitForEventSentTo = <
  T extends ActorLogicWithOutput,
  const EventTypes extends ActorEventTypeTuple<T>,
  Target extends string | xs.AnyActorRef,
>(
  actor: xs.Actor<T>,
  events: EventTypes,
  target: Target,
): ActorThenable<T, ActorEventTuple<T, EventTypes>> => {
  return untilEventSent(actor, events, {stop: false, target});
};

const _runUntilEventSentTo = <
  T extends ActorLogicWithOutput,
  const EventTypes extends ActorEventTypeTuple<T>,
  Target extends string | xs.AnyActorRef,
>(
  actor: xs.Actor<T>,
  events: EventTypes,
  target: Target,
): ActorThenable<T, ActorEventTuple<T, EventTypes>> => {
  return untilEventSent(actor, events, {stop: true, target});
};

export const runUntilEventSentTo = curry(_runUntilEventSentTo);

export const waitForEventSentTo = curry(_waitForEventSentTo);

export const waitForEventSentWith = curry(_waitForEventSentWith);

export const runUntilEventSentWith = curry(_runUntilEventSentWith);

export const waitForEventSent = curry(_waitForEventSent);

export const runUntilEventSent = curry(_runUntilEventSent);
