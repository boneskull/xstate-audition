import * as xs from 'xstate';

import {attachActor, createActorThenable} from './actor.js';
import {applyDefaults} from './defaults.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {
  type ActorEventTuple,
  type ActorEventTypeTuple,
  type ActorThenable,
  type AuditionEventOptions,
  type AuditionOptions,
  type EventFromEventType,
} from './types.js';
import {head, startTimer} from './util.js';

export type CurryEventSent =
  | (() => <
      Logic extends xs.AnyActorLogic,
      Actor extends xs.Actor<Logic>,
      const EventTypes extends ActorEventTypeTuple<Logic>,
    >(
      actor: Actor,
      events: EventTypes,
    ) => CurryEventSentP2<Logic, EventTypes>)
  | (() => <Logic extends xs.AnyActorLogic, Actor extends xs.Actor<Logic>>(
      actor: Actor,
    ) => CurryEventSentP1<Logic>)
  | (() => CurryEventSent);

export type CurryEventSentP1<Logic extends xs.AnyActorLogic> =
  | (() => CurryEventSentP1<Logic>)
  | (<const EventTypes extends ActorEventTypeTuple<Logic>>(
      events: EventTypes,
    ) => CurryEventSentP2<Logic, EventTypes>);

export type CurryEventSentP2<
  Logic extends xs.AnyActorLogic,
  EventTypes extends ActorEventTypeTuple<Logic>,
> = ActorThenable<Logic, ActorEventTuple<Logic, EventTypes>>;

export type CurryEventSentWith =
  | (() => <
      Logic extends xs.AnyStateMachine,
      Actor extends xs.Actor<Logic>,
      const EventSentTypes extends ActorEventTypeTuple<Logic>,
    >(
      actor: Actor,
      events: EventSentTypes,
      options: AuditionOptions,
    ) => CurryEventSentWithP3<Logic, EventSentTypes>)
  | (() => <
      Logic extends xs.AnyStateMachine,
      Actor extends xs.Actor<Logic>,
      const EventSentTypes extends ActorEventTypeTuple<Logic>,
    >(
      actor: Actor,
      events: EventSentTypes,
    ) => CurryEventSentWithP2<Logic, EventSentTypes>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
    ) => CurryEventSentWithP1<Logic>)
  | (() => CurryEventSentWith);

export type CurryEventSentWithP1<Logic extends xs.AnyStateMachine> =
  | (() => CurryEventSentWithP1<Logic>)
  | (<const EventSentTypes extends ActorEventTypeTuple<Logic>>(
      events: EventSentTypes,
      options: AuditionOptions,
    ) => CurryEventSentWithP3<Logic, EventSentTypes>)
  | (<const EventSentTypes extends ActorEventTypeTuple<Logic>>(
      events: EventSentTypes,
    ) => CurryEventSentWithP2<Logic, EventSentTypes>);

export type CurryEventSentWithP2<
  Logic extends xs.AnyStateMachine,
  EventSentTypes extends ActorEventTypeTuple<Logic>,
> =
  | (() => CurryEventSentWithP2<Logic, EventSentTypes>)
  | ((options: AuditionOptions) => CurryEventSentWithP3<Logic, EventSentTypes>);

export type CurryEventSentWithP3<
  Logic extends xs.AnyStateMachine,
  EventSentTypes extends ActorEventTypeTuple<Logic>,
> = ActorThenable<Logic, ActorEventTuple<Logic, EventSentTypes>>;

export type EventSentFn = <
  Logic extends xs.AnyActorLogic,
  Actor extends xs.Actor<Logic>,
  const EventTypes extends ActorEventTypeTuple<Logic>,
>(
  actor: Actor,
  events: EventTypes,
  options: AuditionEventOptions,
) => ActorThenable<Logic, ActorEventTuple<Logic, EventTypes>>;

const createEventFn = <T extends EventSentFn>(eventFn: T, stop = false) => {
  const curryEvent = <
    Logic extends xs.AnyActorLogic,
    Actor extends xs.Actor<Logic>,
    const EventTypes extends ActorEventTypeTuple<Logic>,
  >(
    actor?: Actor,
    events?: EventTypes,
  ) => {
    if (actor) {
      if (events) {
        return eventFn(actor, events, {stop}) as CurryEventSentP2<
          Logic,
          EventTypes
        >;
      }
      return ((events?: EventTypes) =>
        events
          ? curryEvent(actor, events)
          : curryEvent(actor)) as CurryEventSentP1<Logic>;
    }
    return curryEvent as CurryEventSent;
  };

  return curryEvent;
};

const createEventSentWithFn = <T extends EventSentFn>(
  eventSentWithFn: T,
  stop = false,
) => {
  const curryEventSentWith = <
    Logic extends xs.AnyStateMachine,
    Actor extends xs.Actor<Logic>,
    const EventSentTypes extends ActorEventTypeTuple<Logic>,
  >(
    actor?: Actor,
    events?: EventSentTypes,
    options?: AuditionOptions,
  ) => {
    if (actor) {
      if (events) {
        if (options) {
          return eventSentWithFn(actor, events, {
            ...options,
            stop,
          });
        }
        return ((options?: AuditionOptions) => {
          return options
            ? curryEventSentWith(actor, events, options)
            : curryEventSentWith(actor, events);
        }) as CurryEventSentWithP2<Logic, EventSentTypes>;
      }
      return ((events?: EventSentTypes, options?: AuditionOptions) => {
        if (events) {
          return options
            ? curryEventSentWith(actor, events, options)
            : curryEventSentWith(actor, events);
        }
        return curryEventSentWith(actor);
      }) as CurryEventSentWithP1<Logic>;
    }
    return curryEventSentWith as CurryEventSentWith;
  };

  return curryEventSentWith;
};

const untilEventSent = <
  Logic extends xs.AnyActorLogic,
  Actor extends xs.Actor<Logic>,
  const EventTypes extends ActorEventTypeTuple<Logic>,
>(
  actor: Actor,
  events: EventTypes,
  options: AuditionEventOptions,
): ActorThenable<Logic, ActorEventTuple<Logic, EventTypes>> => {
  const {id} = actor;

  const {inspector, stop, target, timeout} = applyDefaults(options);

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
   * @returns `true` if the event matches the expected type and was sent/Event
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
            `Event(s) not sent nor Event before actor completed: ${expectedEventQueue.join(', ')}`,
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
          sawEvents.push(evt.event as EventFromEventType<Logic, typeof type>);
          expectedEventQueue.shift();
          if (!expectedEventQueue.length) {
            resolve(sawEvents);
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
  const sawEvents: ActorEventTuple<Logic, EventTypes> = [] as any;

  actor.start();
  return createActorThenable(actor, promise);
};

const runUntilEventSent_ = createEventFn(untilEventSent, true);

const waitForEventSent_ = createEventFn(untilEventSent, false);

const runUntilEventSentWith_ = createEventSentWithFn(untilEventSent, true);

const waitForEventSentWith_ = createEventSentWithFn(untilEventSent, false);

/**
 * Runs an actor until it sends one or more events (in order), with options
 * including a target actor ID.
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

export function waitForEventSentWith(): CurryEventSentWith;

export function waitForEventSentWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryEventSentWithP1<Logic>;

export function waitForEventSentWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EventSentTypes extends ActorEventTypeTuple<Logic>,
>(
  actor: Actor,
  events: EventSentTypes,
): CurryEventSentWithP2<Logic, EventSentTypes>;

export function waitForEventSentWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EventSentTypes extends ActorEventTypeTuple<Logic>,
>(
  actor: Actor,
  events: EventSentTypes,
  options: AuditionOptions,
): CurryEventSentWithP3<Logic, EventSentTypes>;

export function waitForEventSentWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EventSentTypes extends ActorEventTypeTuple<Logic>,
>(actor?: Actor, events?: EventSentTypes, options?: AuditionOptions) {
  return waitForEventSentWith_(actor, events, options);
}

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
export function runUntilEventSent(): CurryEventSent;

export function runUntilEventSent<
  Logic extends xs.AnyActorLogic,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryEventSentP1<Logic>;

export function runUntilEventSent<
  Logic extends xs.AnyActorLogic,
  Actor extends xs.Actor<Logic>,
  const EventTypes extends ActorEventTypeTuple<Logic>,
>(actor: Actor, events: EventTypes): CurryEventSentP2<Logic, EventTypes>;

export function runUntilEventSent<
  Logic extends xs.AnyActorLogic,
  Actor extends xs.Actor<Logic>,
  const EventTypes extends ActorEventTypeTuple<Logic>,
>(actor?: Actor, events?: EventTypes) {
  return runUntilEventSent_(actor, events);
}

export function runUntilEventSentWith(): CurryEventSentWith;

export function runUntilEventSentWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryEventSentWithP1<Logic>;

export function runUntilEventSentWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EventSentTypes extends ActorEventTypeTuple<Logic>,
>(
  actor: Actor,
  events: EventSentTypes,
): CurryEventSentWithP2<Logic, EventSentTypes>;

export function runUntilEventSentWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EventSentTypes extends ActorEventTypeTuple<Logic>,
>(
  actor: Actor,
  events: EventSentTypes,
  options: AuditionOptions,
): CurryEventSentWithP3<Logic, EventSentTypes>;

export function runUntilEventSentWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EventSentTypes extends ActorEventTypeTuple<Logic>,
>(actor?: Actor, events?: EventSentTypes, options?: AuditionOptions) {
  return runUntilEventSentWith_(actor, events, options);
}

export function waitForEventSent(): CurryEventSent;

export function waitForEventSent<
  Logic extends xs.AnyActorLogic,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryEventSentP1<Logic>;

export function waitForEventSent<
  Logic extends xs.AnyActorLogic,
  Actor extends xs.Actor<Logic>,
  const EventTypes extends ActorEventTypeTuple<Logic>,
>(actor: Actor, events: EventTypes): CurryEventSentP2<Logic, EventTypes>;

export function waitForEventSent<
  Logic extends xs.AnyActorLogic,
  Actor extends xs.Actor<Logic>,
  const EventTypes extends ActorEventTypeTuple<Logic>,
>(actor?: Actor, events?: EventTypes) {
  return waitForEventSent_(actor, events);
}
