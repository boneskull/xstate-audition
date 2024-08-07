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
  type ListenableLogic,
} from './types.js';
import {head, startTimer} from './util.js';

export type CurryEventReceived =
  | (() => <
      Logic extends ListenableLogic,
      Actor extends xs.Actor<Logic>,
      const EventTypes extends ActorEventTypeTuple<Logic>,
    >(
      actor: Actor,
      events: EventTypes,
    ) => CurryEventReceivedP2<Logic, EventTypes>)
  | (() => <Logic extends ListenableLogic, Actor extends xs.Actor<Logic>>(
      actor: Actor,
    ) => CurryEventReceivedP1<Logic>)
  | (() => CurryEventReceived);

export type CurryEventReceivedP1<Logic extends ListenableLogic> =
  | (() => CurryEventReceivedP1<Logic>)
  | (<const EventTypes extends ActorEventTypeTuple<Logic>>(
      events: EventTypes,
    ) => CurryEventReceivedP2<Logic, EventTypes>);

export type CurryEventReceivedP2<
  Logic extends ListenableLogic,
  EventTypes extends ActorEventTypeTuple<Logic>,
> = ActorThenable<Logic, ActorEventTuple<Logic, EventTypes>>;

export type CurryEventReceivedWith =
  | (() => <
      Logic extends xs.AnyStateMachine,
      Actor extends xs.Actor<Logic>,
      const EventReceivedTypes extends ActorEventTypeTuple<Logic>,
    >(
      actor: Actor,
      events: EventReceivedTypes,
      options: AuditionOptions,
    ) => CurryEventReceivedWithP3<Logic, EventReceivedTypes>)
  | (() => <
      Logic extends xs.AnyStateMachine,
      Actor extends xs.Actor<Logic>,
      const EventReceivedTypes extends ActorEventTypeTuple<Logic>,
    >(
      actor: Actor,
      events: EventReceivedTypes,
    ) => CurryEventReceivedWithP2<Logic, EventReceivedTypes>)
  | (() => <Logic extends xs.AnyStateMachine, Actor extends xs.Actor<Logic>>(
      actor: Actor,
    ) => CurryEventReceivedWithP1<Logic>)
  | (() => CurryEventReceivedWith);

export type CurryEventReceivedWithP1<Logic extends xs.AnyStateMachine> =
  | (() => CurryEventReceivedWithP1<Logic>)
  | (<const EventReceivedTypes extends ActorEventTypeTuple<Logic>>(
      events: EventReceivedTypes,
      options: AuditionOptions,
    ) => CurryEventReceivedWithP3<Logic, EventReceivedTypes>)
  | (<const EventReceivedTypes extends ActorEventTypeTuple<Logic>>(
      events: EventReceivedTypes,
    ) => CurryEventReceivedWithP2<Logic, EventReceivedTypes>);

export type CurryEventReceivedWithP2<
  Logic extends xs.AnyStateMachine,
  EventReceivedTypes extends ActorEventTypeTuple<Logic>,
> =
  | ((
      options: AuditionOptions,
    ) => CurryEventReceivedWithP3<Logic, EventReceivedTypes>)
  | (() => CurryEventReceivedWithP2<Logic, EventReceivedTypes>);

export type CurryEventReceivedWithP3<
  Logic extends xs.AnyStateMachine,
  EventReceivedTypes extends ActorEventTypeTuple<Logic>,
> = ActorThenable<Logic, ActorEventTuple<Logic, EventReceivedTypes>>;

export type EventReceivedFn = <
  Logic extends ListenableLogic,
  Actor extends xs.Actor<Logic>,
  const EventTypes extends ActorEventTypeTuple<Logic>,
>(
  actor: Actor,
  events: EventTypes,
  options: AuditionEventOptions,
) => ActorThenable<Logic, ActorEventTuple<Logic, EventTypes>>;

const createEventFn = <T extends EventReceivedFn>(eventFn: T, stop = false) => {
  const curryEvent = <
    Logic extends ListenableLogic,
    Actor extends xs.Actor<Logic>,
    const EventTypes extends ActorEventTypeTuple<Logic>,
  >(
    actor?: Actor,
    events?: EventTypes,
  ) => {
    if (actor) {
      if (events) {
        return eventFn(actor, events, {stop}) as CurryEventReceivedP2<
          Logic,
          EventTypes
        >;
      }
      return ((events?: EventTypes) =>
        events
          ? curryEvent(actor, events)
          : curryEvent(actor)) as CurryEventReceivedP1<Logic>;
    }
    return curryEvent as CurryEventReceived;
  };

  return curryEvent;
};

const createEventReceivedWithFn = <T extends EventReceivedFn>(
  eventReceivedWithFn: T,
  stop = false,
) => {
  const curryEventReceivedWith = <
    Logic extends xs.AnyStateMachine,
    Actor extends xs.Actor<Logic>,
    const EventReceivedTypes extends ActorEventTypeTuple<Logic>,
  >(
    actor?: Actor,
    events?: EventReceivedTypes,
    options?: AuditionOptions,
  ) => {
    if (actor) {
      if (events) {
        if (options) {
          return eventReceivedWithFn(actor, events, {
            ...options,
            stop,
          });
        }
        return ((options?: AuditionOptions) => {
          return options
            ? curryEventReceivedWith(actor, events, options)
            : curryEventReceivedWith(actor, events);
        }) as CurryEventReceivedWithP2<Logic, EventReceivedTypes>;
      }
      return ((events?: EventReceivedTypes, options?: AuditionOptions) => {
        if (events) {
          return options
            ? curryEventReceivedWith(actor, events, options)
            : curryEventReceivedWith(actor, events);
        }
        return curryEventReceivedWith(actor);
      }) as CurryEventReceivedWithP1<Logic>;
    }
    return curryEventReceivedWith as CurryEventReceivedWith;
  };

  return curryEventReceivedWith;
};

const untilEventReceived = <
  Logic extends ListenableLogic,
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
  const matchesEventToActor = (
    evt: xs.InspectionEvent,
    type: EventTypes[number],
  ): evt is xs.InspectedEventEvent =>
    evt.type === '@xstate.event' &&
    type === evt.event.type &&
    evt.actorRef.id === id;

  const eventReceivedInspector: xs.Observer<xs.InspectionEvent> = {
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

        if (matchesEventToActor(evt, type)) {
          // in this type of event, the `actorRef` is a target actor and the `sourceRef` is a source
          if (!matchesTarget(evt.sourceRef)) {
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

  actor = attachActor(actor, {...options, inspector: eventReceivedInspector});

  const expectedEventQueue = [...events];

  if (!expectedEventQueue.length) {
    throw new TypeError('Expected one or more event types');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const sawEvents: ActorEventTuple<Logic, EventTypes> = [] as any;

  actor.start();
  return createActorThenable(actor, promise);
};

const runUntilEventReceived_ = createEventFn(untilEventReceived, true);

const waitForEventReceived_ = createEventFn(untilEventReceived, false);

const runUntilEventReceivedWith_ = createEventReceivedWithFn(
  untilEventReceived,
  true,
);

const waitForEventReceivedWith_ = createEventReceivedWithFn(
  untilEventReceived,
  false,
);

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

export function waitForEventReceivedWith(): CurryEventReceivedWith;

export function waitForEventReceivedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryEventReceivedWithP1<Logic>;

export function waitForEventReceivedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EventReceivedTypes extends ActorEventTypeTuple<Logic>,
>(
  actor: Actor,
  events: EventReceivedTypes,
): CurryEventReceivedWithP2<Logic, EventReceivedTypes>;

export function waitForEventReceivedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EventReceivedTypes extends ActorEventTypeTuple<Logic>,
>(
  actor: Actor,
  events: EventReceivedTypes,
  options: AuditionOptions,
): CurryEventReceivedWithP3<Logic, EventReceivedTypes>;

export function waitForEventReceivedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EventReceivedTypes extends ActorEventTypeTuple<Logic>,
>(actor?: Actor, events?: EventReceivedTypes, options?: AuditionOptions) {
  return waitForEventReceivedWith_(actor, events, options);
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
export function runUntilEventReceived(): CurryEventReceived;

export function runUntilEventReceived<
  Logic extends ListenableLogic,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryEventReceivedP1<Logic>;

export function runUntilEventReceived<
  Logic extends ListenableLogic,
  Actor extends xs.Actor<Logic>,
  const EventTypes extends ActorEventTypeTuple<Logic>,
>(actor: Actor, events: EventTypes): CurryEventReceivedP2<Logic, EventTypes>;

export function runUntilEventReceived<
  Logic extends ListenableLogic,
  Actor extends xs.Actor<Logic>,
  const EventTypes extends ActorEventTypeTuple<Logic>,
>(actor?: Actor, events?: EventTypes) {
  return runUntilEventReceived_(actor, events);
}

export function runUntilEventReceivedWith(): CurryEventReceivedWith;

export function runUntilEventReceivedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryEventReceivedWithP1<Logic>;

export function runUntilEventReceivedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EventReceivedTypes extends ActorEventTypeTuple<Logic>,
>(
  actor: Actor,
  events: EventReceivedTypes,
): CurryEventReceivedWithP2<Logic, EventReceivedTypes>;

export function runUntilEventReceivedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EventReceivedTypes extends ActorEventTypeTuple<Logic>,
>(
  actor: Actor,
  events: EventReceivedTypes,
  options: AuditionOptions,
): CurryEventReceivedWithP3<Logic, EventReceivedTypes>;

export function runUntilEventReceivedWith<
  Logic extends xs.AnyStateMachine,
  Actor extends xs.Actor<Logic>,
  const EventReceivedTypes extends ActorEventTypeTuple<Logic>,
>(actor?: Actor, events?: EventReceivedTypes, options?: AuditionOptions) {
  return runUntilEventReceivedWith_(actor, events, options);
}

export function waitForEventReceived(): CurryEventReceived;

export function waitForEventReceived<
  Logic extends ListenableLogic,
  Actor extends xs.Actor<Logic>,
>(actor: Actor): CurryEventReceivedP1<Logic>;

export function waitForEventReceived<
  Logic extends ListenableLogic,
  Actor extends xs.Actor<Logic>,
  const EventTypes extends ActorEventTypeTuple<Logic>,
>(actor: Actor, events: EventTypes): CurryEventReceivedP2<Logic, EventTypes>;

export function waitForEventReceived<
  Logic extends ListenableLogic,
  Actor extends xs.Actor<Logic>,
  const EventTypes extends ActorEventTypeTuple<Logic>,
>(actor?: Actor, events?: EventTypes) {
  return waitForEventReceived_(actor, events);
}
