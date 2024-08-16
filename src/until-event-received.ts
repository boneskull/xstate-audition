import * as xs from 'xstate';

import {patchActor} from './actor.js';
import {applyDefaults} from './defaults.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {startTimer} from './timer.js';
import {
  type ActorEventTuple,
  type ActorEventTypeTuple,
  type AnyEventReceiverActor,
  type AuditionEventOptions,
  type AuditionOptions,
  type EventFromEventType,
  type InternalAuditionEventOptions,
} from './types.js';
import {head} from './util.js';

export type CurryEventReceived = (() => CurryEventReceived) &
  (<
    Actor extends AnyEventReceiverActor,
    const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
  >(
    actor: Actor,
    eventTypes: EventReceivedTypes,
  ) => CurryEventReceivedP2<Actor, EventReceivedTypes>) &
  (<Actor extends AnyEventReceiverActor>(
    actor: Actor,
  ) => CurryEventReceivedP1<Actor>);

export type CurryEventReceivedP1<Actor extends AnyEventReceiverActor> =
  (() => CurryEventReceivedP1<Actor>) &
    (<const EventReceivedTypes extends ActorEventTypeTuple<Actor>>(
      eventTypes: EventReceivedTypes,
    ) => CurryEventReceivedP2<Actor, EventReceivedTypes>);

export type CurryEventReceivedP2<
  Actor extends AnyEventReceiverActor,
  EventReceivedTypes extends ActorEventTypeTuple<Actor>,
> = Promise<ActorEventTuple<Actor, EventReceivedTypes>>;

export type CurryEventReceivedWith = (() => CurryEventReceivedWith) &
  (<
    Actor extends AnyEventReceiverActor,
    const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
  >(
    actor: Actor,
    options: AuditionOptions,
    eventTypes: EventReceivedTypes,
  ) => CurryEventReceivedWithP3<Actor, EventReceivedTypes>) &
  (<Actor extends AnyEventReceiverActor>(
    actor: Actor,
    options: AuditionEventOptions,
  ) => CurryEventReceivedWithP2<Actor>) &
  (<Actor extends AnyEventReceiverActor>(
    actor: Actor,
  ) => CurryEventReceivedWithP1<Actor>);

export type CurryEventReceivedWithP1<Actor extends AnyEventReceiverActor> =
  (() => CurryEventReceivedWithP1<Actor>) &
    ((options: AuditionEventOptions) => CurryEventReceivedWithP2<Actor>) &
    (<const EventReceivedTypes extends ActorEventTypeTuple<Actor>>(
      options: AuditionOptions,
      eventTypes: EventReceivedTypes,
    ) => CurryEventReceivedWithP3<Actor, EventReceivedTypes>);

export type CurryEventReceivedWithP2<Actor extends AnyEventReceiverActor> =
  (() => CurryEventReceivedWithP2<Actor>) &
    (<const EventReceivedTypes extends ActorEventTypeTuple<Actor>>(
      eventTypes: EventReceivedTypes,
    ) => CurryEventReceivedWithP3<Actor, EventReceivedTypes>);

export type CurryEventReceivedWithP3<
  Actor extends AnyEventReceiverActor,
  EventReceivedTypes extends ActorEventTypeTuple<Actor>,
> = Promise<ActorEventTuple<Actor, EventReceivedTypes>>;

/**
 * Runs an XState `Actor` until it receives one or more events (in order).
 *
 * @template Actor The type of `actor`
 * @template EventReceivedTypes The type of `eventTypes`
 * @param actor An XState `Actor` that can receive events
 * @param eventTypes One or more _event names_ (the `type` field) to wait for
 *   (in order)
 * @returns A `Promise` fulfilling with the matching events (assuming they all
 *   occurred in order)
 */
export function runUntilEventReceived<
  Actor extends AnyEventReceiverActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(
  actor: Actor,
  eventTypes: EventReceivedTypes,
): CurryEventReceivedP2<Actor, EventReceivedTypes>;

/**
 * Returns a function which runs an actor until it sends one or more events (in
 * order).
 *
 * @template Actor The type of `actor`
 * @param actor An XState `Actor` that can receive events
 * @returns A function which runs an actor until it sends one or more events (in
 *   order)
 */
export function runUntilEventReceived<Actor extends AnyEventReceiverActor>(
  actor: Actor,
): CurryEventReceivedP1<Actor>;

/**
 * Returns itself.
 *
 * @returns A function which returns itself
 */
export function runUntilEventReceived(): CurryEventReceived;

export function runUntilEventReceived<
  Actor extends AnyEventReceiverActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(actor?: Actor, events?: EventReceivedTypes) {
  return runUntilEventReceived_(actor, events);
}

export function runUntilEventReceivedWith(): CurryEventReceivedWith;

export function runUntilEventReceivedWith<Actor extends AnyEventReceiverActor>(
  actor: Actor,
): CurryEventReceivedWithP1<Actor>;

export function runUntilEventReceivedWith<Actor extends AnyEventReceiverActor>(
  actor: Actor,
  options: AuditionEventOptions,
): CurryEventReceivedWithP2<Actor>;

export function runUntilEventReceivedWith<
  Actor extends AnyEventReceiverActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(
  actor: Actor,
  options: AuditionOptions,
  eventTypes: EventReceivedTypes,
): CurryEventReceivedWithP3<Actor, EventReceivedTypes>;

export function runUntilEventReceivedWith<
  Actor extends AnyEventReceiverActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(actor?: Actor, options?: AuditionOptions, events?: EventReceivedTypes) {
  return runUntilEventReceivedWith_(actor, options, events);
}

export function waitForEventReceived(): CurryEventReceived;

export function waitForEventReceived<Actor extends AnyEventReceiverActor>(
  actor: Actor,
): CurryEventReceivedP1<Actor>;

export function waitForEventReceived<
  Actor extends AnyEventReceiverActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(
  actor: Actor,
  eventTypes: EventReceivedTypes,
): CurryEventReceivedP2<Actor, EventReceivedTypes>;

export function waitForEventReceived<
  Actor extends AnyEventReceiverActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(actor?: Actor, events?: EventReceivedTypes) {
  return waitForEventReceived_(actor, events);
}

/**
 * Returns itself.
 *
 * @returns A function which returns itself
 */
export function waitForEventReceivedWith(): CurryEventReceivedWith;

/**
 * Returns a function which, if provided {@link AuditionEventOptions options} and
 * {@link ActorEventTypeTuple event types}, will waits until an XState `Actor`
 * receives one or more events (in order).
 *
 * @template Actor The type of `actor`
 * @param actor An XState `Actor` that can receive events
 * @returns Returns a function which, if provided
 *   {@link AuditionEventOptions options} and
 *   {@link ActorEventTypeTuple event types}, will waits until an XState `Actor`
 *   receives one or more events (in order).
 */
export function waitForEventReceivedWith<Actor extends AnyEventReceiverActor>(
  actor: Actor,
): CurryEventReceivedWithP1<Actor>;

/**
 * Returns a function which waits until an XState `Actor` receives one or more
 * events (in order).
 *
 * @template Actor The type of `actor`
 * @param actor An XState `Actor` that can receive events
 * @param options Options, including `otherActorId` which will filter on the
 *   sender
 * @returns A `Promise` fulfilling with the matching events (assuming they all
 *   occurred in order)
 */
export function waitForEventReceivedWith<Actor extends AnyEventReceiverActor>(
  actor: Actor,
  options: AuditionEventOptions,
): CurryEventReceivedWithP2<Actor>;

/**
 * Wait until an XState `Actor` receives one or more events (in order).
 *
 * @template Actor The type of `actor`
 * @template EventReceivedTypes The type of `eventTypes`
 * @param actor An XState `Actor` that can receive events
 * @param options Options, including `otherActorId` which will filter on the
 *   sender
 * @param eventTypes One or more _event names_ (the `type` field) to wait for
 *   (in order)
 * @returns A `Promise` fulfilling with the matching events (assuming they all
 *   occurred in order)
 */
export function waitForEventReceivedWith<
  Actor extends AnyEventReceiverActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(
  actor: Actor,
  options: AuditionOptions,
  eventTypes: EventReceivedTypes,
): CurryEventReceivedWithP3<Actor, EventReceivedTypes>;

export function waitForEventReceivedWith<
  Actor extends AnyEventReceiverActor,
  const EventReceivedTypes extends ActorEventTypeTuple<Actor>,
>(actor?: Actor, options?: AuditionOptions, events?: EventReceivedTypes) {
  return waitForEventReceivedWith_(actor, options, events);
}

const createEventFn = (stop = false) => {
  const curryEvent = <
    Actor extends AnyEventReceiverActor,
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
    Actor extends AnyEventReceiverActor,
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

const untilEventReceived = async <
  Actor extends AnyEventReceiverActor,
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
        patchActor(evt.actorRef, {logger});
        seenActors.add(evt.actorRef);
      }

      if (abortController.signal.aborted) {
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

  patchActor(actor, {...opts, inspector: eventReceivedInspector});
  seenActors.add(actor);

  const expectedEventQueue = [...eventTypes];

  if (!expectedEventQueue.length) {
    throw new TypeError('Expected one or more event types');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const seenEvents: ActorEventTuple<Actor, EventReceivedTypes> = [] as any;

  void xs.toPromise(actor).catch(reject);
  actor.start();

  try {
    return await promise;
  } finally {
    if (stop) {
      actor.stop();
    }
  }
};

const runUntilEventReceived_ = createEventFn(true);

const waitForEventReceived_ = createEventFn(false);

const runUntilEventReceivedWith_ = createEventReceivedWithFn(true);

const waitForEventReceivedWith_ = createEventReceivedWithFn(false);
