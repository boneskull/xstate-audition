import * as xs from 'xstate';

import {attachActor} from './actor.js';
import {applyDefaults} from './defaults.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {startTimer} from './timer.js';
import {
  type ActorEventTuple,
  type ActorEventTypeTuple,
  type AnyListenableActor,
  type AuditionEventOptions,
  type AuditionOptions,
  type EventFromEventType,
  type InternalAuditionEventOptions,
} from './types.js';
import {head} from './util.js';

export type CurryEventReceived = (() => CurryEventReceived) &
  (<
    Actor extends AnyListenableActor,
    const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
  >(
    actor: Actor,
    eventTypes: EventReceivedTypes,
  ) => CurryEventReceivedP2<Actor, EventReceivedTypes>) &
  (<Actor extends AnyListenableActor>(
    actor: Actor,
  ) => CurryEventReceivedP1<Actor>);

export type CurryEventReceivedP1<Actor extends AnyListenableActor> =
  (() => CurryEventReceivedP1<Actor>) &
    (<const EventReceivedTypes extends ActorEventTypeTuple<Actor>>(
      eventTypes: EventReceivedTypes,
    ) => CurryEventReceivedP2<Actor, EventReceivedTypes>);

export type CurryEventReceivedP2<
  Actor extends AnyListenableActor,
  EventReceivedTypes extends ActorEventTypeTuple<Actor>,
> = Promise<ActorEventTuple<Actor, EventReceivedTypes>>;

export type CurryEventReceivedWith = (() => CurryEventReceivedWith) &
  (<
    Actor extends AnyListenableActor,
    const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
  >(
    actor: Actor,
    options: AuditionOptions,
    eventTypes: EventReceivedTypes,
  ) => CurryEventReceivedWithP3<Actor, EventReceivedTypes>) &
  (<Actor extends AnyListenableActor>(
    actor: Actor,
    options: AuditionEventOptions,
  ) => CurryEventReceivedWithP2<Actor>) &
  (<Actor extends AnyListenableActor>(
    actor: Actor,
  ) => CurryEventReceivedWithP1<Actor>);

export type CurryEventReceivedWithP1<Actor extends AnyListenableActor> =
  (() => CurryEventReceivedWithP1<Actor>) &
    ((options: AuditionEventOptions) => CurryEventReceivedWithP2<Actor>) &
    (<const EventReceivedTypes extends ActorEventTypeTuple<Actor>>(
      options: AuditionOptions,
      eventTypes: EventReceivedTypes,
    ) => CurryEventReceivedWithP3<Actor, EventReceivedTypes>);

export type CurryEventReceivedWithP2<Actor extends AnyListenableActor> =
  (() => CurryEventReceivedWithP2<Actor>) &
    (<const EventReceivedTypes extends ActorEventTypeTuple<Actor>>(
      eventTypes: EventReceivedTypes,
    ) => CurryEventReceivedWithP3<Actor, EventReceivedTypes>);

export type CurryEventReceivedWithP3<
  Actor extends AnyListenableActor,
  EventReceivedTypes extends ActorEventTypeTuple<Actor>,
> = Promise<ActorEventTuple<Actor, EventReceivedTypes>>;

/**
 * Runs an actor until it sends one or more events (in order).
 *
 * @param actor An existing {@link Actor}
 * @param events One or more _event names_ (the `type` field) to wait for (in
 *   order)
 * @returns The matching events (assuming they all occurred in order)
 */
export function runUntilEventReceived(): CurryEventReceived;

export function runUntilEventReceived<Actor extends AnyListenableActor>(
  actor: Actor,
): CurryEventReceivedP1<Actor>;

export function runUntilEventReceived<
  Actor extends AnyListenableActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(
  actor: Actor,
  eventTypes: EventReceivedTypes,
): CurryEventReceivedP2<Actor, EventReceivedTypes>;

export function runUntilEventReceived<
  Actor extends AnyListenableActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(actor?: Actor, events?: EventReceivedTypes) {
  return runUntilEventReceived_(actor, events);
}

export function runUntilEventReceivedWith(): CurryEventReceivedWith;

export function runUntilEventReceivedWith<Actor extends AnyListenableActor>(
  actor: Actor,
): CurryEventReceivedWithP1<Actor>;

export function runUntilEventReceivedWith<Actor extends AnyListenableActor>(
  actor: Actor,
  options: AuditionEventOptions,
): CurryEventReceivedWithP2<Actor>;

export function runUntilEventReceivedWith<
  Actor extends AnyListenableActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(
  actor: Actor,
  options: AuditionOptions,
  eventTypes: EventReceivedTypes,
): CurryEventReceivedWithP3<Actor, EventReceivedTypes>;

export function runUntilEventReceivedWith<
  Actor extends AnyListenableActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(actor?: Actor, options?: AuditionOptions, events?: EventReceivedTypes) {
  return runUntilEventReceivedWith_(actor, options, events);
}

export function waitForEventReceived(): CurryEventReceived;

export function waitForEventReceived<Actor extends AnyListenableActor>(
  actor: Actor,
): CurryEventReceivedP1<Actor>;

export function waitForEventReceived<
  Actor extends AnyListenableActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(
  actor: Actor,
  eventTypes: EventReceivedTypes,
): CurryEventReceivedP2<Actor, EventReceivedTypes>;

export function waitForEventReceived<
  Actor extends AnyListenableActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(actor?: Actor, events?: EventReceivedTypes) {
  return waitForEventReceived_(actor, events);
}

/**
 * Runs an actor until it sends one or more events (in order), with options
 * including a target actor ID.
 *
 * @param actor An existing {@link Actor}
 * @param events One or more _event names_ (the `type` field) to wait for (in
 *   order)
 * @param options Options
 * @returns The matching events (assuming they all occurred in order)
 */
export function waitForEventReceivedWith(): CurryEventReceivedWith;

export function waitForEventReceivedWith<Actor extends AnyListenableActor>(
  actor: Actor,
): CurryEventReceivedWithP1<Actor>;

export function waitForEventReceivedWith<Actor extends AnyListenableActor>(
  actor: Actor,
  options: AuditionEventOptions,
): CurryEventReceivedWithP2<Actor>;

export function waitForEventReceivedWith<
  Actor extends AnyListenableActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(
  actor: Actor,
  options: AuditionOptions,
  eventTypes: EventReceivedTypes,
): CurryEventReceivedWithP3<Actor, EventReceivedTypes>;

export function waitForEventReceivedWith<
  Actor extends AnyListenableActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(actor?: Actor, options?: AuditionOptions, events?: EventReceivedTypes) {
  return waitForEventReceivedWith_(actor, options, events);
}

const createEventFn = (stop = false) => {
  const curryEvent = <
    Actor extends AnyListenableActor,
    const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
  >(
    actor?: Actor,
    events?: EventReceivedTypes,
  ) => {
    if (actor) {
      if (events) {
        return untilEventReceived(actor, {stop}, events);
      }

      return ((events?: EventReceivedTypes) =>
        events
          ? curryEvent(actor, events)
          : curryEvent(actor)) as CurryEventReceivedP1<Actor>;
    }

    return curryEvent as CurryEventReceived;
  };

  return curryEvent;
};

const createEventReceivedWithFn = (stop = false) => {
  const curryEventReceivedWith = <
    Actor extends AnyListenableActor,
    const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
  >(
    actor?: Actor,
    options?: AuditionOptions,
    events?: EventReceivedTypes,
  ) => {
    if (actor) {
      if (options) {
        if (events) {
          return untilEventReceived(
            actor,
            {
              ...options,
              stop,
            },
            events,
          );
        }

        return ((events?: EventReceivedTypes) => {
          return events
            ? curryEventReceivedWith(actor, options, events)
            : curryEventReceivedWith(actor, options);
        }) as CurryEventReceivedWithP2<Actor>;
      }

      return ((options?: AuditionOptions, events?: EventReceivedTypes) => {
        if (options) {
          return events
            ? curryEventReceivedWith(actor, options, events)
            : curryEventReceivedWith(actor, options);
        }

        return curryEventReceivedWith(actor);
      }) as CurryEventReceivedWithP1<Actor>;
    }

    return curryEventReceivedWith as CurryEventReceivedWith;
  };

  return curryEventReceivedWith;
};

const untilEventReceived = <
  Actor extends AnyListenableActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(
  actor: Actor,
  options: InternalAuditionEventOptions,
  eventTypes: EventReceivedTypes,
): Promise<ActorEventTuple<Actor, EventReceivedTypes>> => {
  const {id} = actor;

  const opts = applyDefaults(options);

  const {inspector, logger, otherActorId, stop, timeout} = opts;

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<ActorEventTuple<Actor, EventReceivedTypes>>();

  const inspectorObserver = xs.toObserver(inspector);

  startTimer(
    actor,
    abortController,
    timeout,
    `Actor did not complete in ${timeout}ms`,
  );

  /**
   * If we have a `target` actor ID, this asserts a given `ActorRef`'s `id`
   * matches the target.
   */
  const matchesTarget = otherActorId
    ? (actorRef?: xs.AnyActorRef) => actorRef?.id === otherActorId
    : () => true;

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
    type: EventReceivedTypes[number],
  ): evt is xs.InspectedEventEvent =>
    evt.type === '@xstate.event' &&
    type === evt.event.type &&
    evt.actorRef.id === id;

  const seenActors: WeakSet<xs.AnyActorRef> = new WeakSet();

  const eventReceivedInspector: xs.Observer<xs.InspectionEvent> = {
    complete: () => {
      inspectorObserver.complete?.();
      if (abortController.signal.aborted) {
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

      if (!seenActors.has(evt.actorRef)) {
        attachActor(evt.actorRef, {logger});
        seenActors.add(evt.actorRef);
      }

      if (abortController.signal.aborted) {
        actor.stop();

        return;
      }

      if (evt.type === '@xstate.event' && expectedEventQueue.length) {
        const type = head(expectedEventQueue);

        if (matchesEventToActor(evt, type)) {
          // in this type of event, the `actorRef` is a target actor and the `sourceRef` is a source
          if (!matchesTarget(evt.sourceRef)) {
            return;
          }

          seenEvents.push(evt.event as EventFromEventType<Actor, typeof type>);
          expectedEventQueue.shift();

          if (!expectedEventQueue.length) {
            if (stop) {
              actor.stop();
            }
            resolve(seenEvents);
          }
        }
      }
    },
  };

  attachActor(actor, {...opts, inspector: eventReceivedInspector});
  seenActors.add(actor);

  const expectedEventQueue = [...eventTypes];

  if (!expectedEventQueue.length) {
    throw new TypeError('Expected one or more event types');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const seenEvents: ActorEventTuple<Actor, EventReceivedTypes> = [] as any;

  actor.start();

  return promise;
};

const runUntilEventReceived_ = createEventFn(true);

const waitForEventReceived_ = createEventFn(false);

const runUntilEventReceivedWith_ = createEventReceivedWithFn(true);

const waitForEventReceivedWith_ = createEventReceivedWithFn(false);