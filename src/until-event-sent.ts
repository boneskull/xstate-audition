import * as xs from 'xstate';

import {attachActor} from './actor.js';
import {applyDefaults} from './defaults.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {startTimer} from './timer.js';
import {
  type ActorEventTuple,
  type ActorEventTypeTuple,
  type AnyActor,
  type AnyEventReceiverActor,
  type AuditionEventOptions,
  type EventFromEventType,
  type InternalAuditionEventOptions,
} from './types.js';
import {head} from './util.js';

export type CurryEventSent = (() => CurryEventSent) &
  (<
    Actor extends AnyActor,
    Target extends AnyEventReceiverActor = AnyEventReceiverActor,
    const EventSentTypes extends
      ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
  >(
    actor: Actor,
    eventTypes: EventSentTypes,
  ) => CurryEventSentP2<Target, EventSentTypes>) &
  (<Actor extends AnyActor>(actor: Actor) => CurryEventSentP1<Actor>);

export type CurryEventSentP1<
  Actor extends AnyActor,
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
> = (() => CurryEventSentP1<Actor, Target>) &
  (<
    const EventSentTypes extends
      ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
  >(
    eventTypes: EventSentTypes,
  ) => CurryEventSentP2<Target, EventSentTypes>);

export type CurryEventSentP2<
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
  EventSentTypes extends
    ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
> = Promise<ActorEventTuple<Target, EventSentTypes>>;

export type CurryEventSentWith = (() => CurryEventSentWith) &
  (<
    Actor extends AnyActor,
    Target extends AnyEventReceiverActor = AnyEventReceiverActor,
    const EventSentTypes extends
      ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
  >(
    actor: Actor,
    options: AuditionEventOptions,
    eventTypes: EventSentTypes,
  ) => CurryEventSentWithP3<Target, EventSentTypes>) &
  (<
    Actor extends AnyActor,
    Target extends AnyEventReceiverActor = AnyEventReceiverActor,
  >(
    actor: Actor,
    options: AuditionEventOptions,
  ) => CurryEventSentWithP2<Actor, Target>) &
  (<Actor extends AnyActor>(actor: Actor) => CurryEventSentWithP1<Actor>);

export type CurryEventSentWithP1<Actor extends AnyActor> =
  (() => CurryEventSentWithP1<Actor>) &
    ((options: AuditionEventOptions) => CurryEventSentWithP2<Actor>) &
    (<
      Target extends AnyEventReceiverActor = AnyEventReceiverActor,
      const EventSentTypes extends
        ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
    >(
      options: AuditionEventOptions,
      eventTypes: EventSentTypes,
    ) => CurryEventSentWithP3<Target, EventSentTypes>);

export type CurryEventSentWithP2<
  Actor extends AnyActor,
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
> = (() => CurryEventSentWithP2<Actor, Target>) &
  (<
    const EventSentTypes extends
      ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
  >(
    eventTypes: EventSentTypes,
  ) => CurryEventSentWithP3<Target, EventSentTypes>);

export type CurryEventSentWithP3<
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
  EventSentTypes extends
    ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
> = Promise<ActorEventTuple<Target, EventSentTypes>>;

/**
 * Runs an actor until it sends one or more events (in order).
 *
 * @param actor An existing {@link Actor}
 * @param events One or more _event names_ (the `type` field) to wait for (in
 *   order)
 * @returns The matching events (assuming they all occurred in order)
 */
export function runUntilEventSent(): CurryEventSent;

export function runUntilEventSent<
  Actor extends AnyActor,
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
>(actor: Actor): CurryEventSentP1<Actor, Target>;

export function runUntilEventSent<
  Actor extends AnyActor,
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
  const EventSentTypes extends
    ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
>(
  actor: Actor,
  eventTypes: EventSentTypes,
): CurryEventSentP2<Target, EventSentTypes>;

export function runUntilEventSent<
  Actor extends AnyActor,
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
  const EventSentTypes extends
    ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
>(actor?: Actor, eventTypes?: EventSentTypes) {
  return runUntilEventSent_(actor, eventTypes);
}

export function runUntilEventSentWith(): CurryEventSentWith;

export function runUntilEventSentWith<Actor extends AnyActor>(
  actor: Actor,
): CurryEventSentWithP1<Actor>;

export function runUntilEventSentWith<Actor extends AnyActor>(
  actor: Actor,
  options: AuditionEventOptions,
): CurryEventSentWithP2<Actor>;

export function runUntilEventSentWith<
  Actor extends AnyActor,
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
  const EventSentTypes extends
    ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
>(
  actor: Actor,
  options: AuditionEventOptions,
  eventTypes: EventSentTypes,
): CurryEventSentWithP3<Target, EventSentTypes>;

export function runUntilEventSentWith<
  Actor extends AnyActor,
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
  const EventSentTypes extends
    ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
>(actor?: Actor, options?: AuditionEventOptions, events?: EventSentTypes) {
  return runUntilEventSentWith_(actor, options, events);
}

export function waitForEventSent(): CurryEventSent;

export function waitForEventSent<Actor extends AnyActor>(
  actor: Actor,
): CurryEventSentP1<Actor>;

export function waitForEventSent<
  Actor extends AnyActor,
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
  const EventSentTypes extends
    ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
>(
  actor: Actor,
  eventTypes: EventSentTypes,
): CurryEventSentP2<Target, EventSentTypes>;

export function waitForEventSent<
  Actor extends AnyActor,
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
  const EventSentTypes extends
    ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
>(actor?: Actor, events?: EventSentTypes) {
  return waitForEventSent_(actor, events);
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
export function waitForEventSentWith(): CurryEventSentWith;

export function waitForEventSentWith<Actor extends AnyActor>(
  actor: Actor,
): CurryEventSentWithP1<Actor>;

export function waitForEventSentWith<Actor extends AnyActor>(
  actor: Actor,
  options: AuditionEventOptions,
): CurryEventSentWithP2<Actor>;

export function waitForEventSentWith<
  Actor extends AnyActor,
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
  const EventSentTypes extends
    ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
>(
  actor: Actor,
  options: AuditionEventOptions,
  eventTypes: EventSentTypes,
): CurryEventSentWithP3<Target, EventSentTypes>;

export function waitForEventSentWith<
  Actor extends AnyActor,
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
  const EventSentTypes extends
    ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
>(actor?: Actor, options?: AuditionEventOptions, events?: EventSentTypes) {
  return waitForEventSentWith_(actor, options, events);
}

const createEventFn = (stop = false) => {
  const curryEvent = <
    Actor extends AnyActor,
    Target extends AnyEventReceiverActor = AnyEventReceiverActor,
    const EventSentTypes extends
      ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
  >(
    actor?: Actor,
    events?: EventSentTypes,
  ) => {
    if (actor) {
      if (events) {
        return untilEventSent(actor, {stop}, events);
      }

      return ((events?: EventSentTypes) =>
        events
          ? curryEvent(actor, events)
          : curryEvent(actor)) as CurryEventSentP1<Actor, Target>;
    }

    return curryEvent as CurryEventSent;
  };

  return curryEvent;
};

const createEventSentWithFn = (stop = false) => {
  const curryEventSentWith = <
    Actor extends AnyActor,
    Target extends AnyEventReceiverActor = AnyEventReceiverActor,
    const EventSentTypes extends
      ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
  >(
    actor?: Actor,
    options?: AuditionEventOptions,
    events?: EventSentTypes,
  ) => {
    if (actor) {
      if (options) {
        if (events) {
          return untilEventSent(
            actor,
            {
              ...options,
              stop,
            },
            events,
          );
        }

        return ((events?: EventSentTypes) => {
          return events
            ? curryEventSentWith(actor, options, events)
            : curryEventSentWith(actor, options);
        }) as CurryEventSentWithP2<Actor>;
      }

      return ((options?: AuditionEventOptions, events?: EventSentTypes) => {
        if (options) {
          return events
            ? curryEventSentWith(actor, options, events)
            : curryEventSentWith(actor, options);
        }

        return curryEventSentWith(actor);
      }) as CurryEventSentWithP1<Actor>;
    }

    return curryEventSentWith as CurryEventSentWith;
  };

  return curryEventSentWith;
};

const untilEventSent = async <
  Actor extends AnyActor,
  Target extends AnyEventReceiverActor = AnyEventReceiverActor,
  const EventSentTypes extends
    ActorEventTypeTuple<Target> = ActorEventTypeTuple<Target>,
>(
  actor: Actor,
  options: InternalAuditionEventOptions,
  eventTypes: EventSentTypes,
): Promise<ActorEventTuple<Target, EventSentTypes>> => {
  const {id} = actor;

  const opts = applyDefaults(options);

  const {inspector, logger, otherActorId, stop, timeout} = opts;

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<ActorEventTuple<Target, EventSentTypes>>();

  const inspectorObserver = xs.toObserver(inspector);

  startTimer(
    actor,
    abortController,
    timeout,
    `Actor did not send event(s) in ${timeout}ms`,
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
  const matchesEventFromActor = (
    evt: xs.InspectionEvent,
    type: EventSentTypes[number],
  ): evt is xs.InspectedEventEvent =>
    evt.type === '@xstate.event' &&
    type === evt.event.type &&
    evt.sourceRef?.id === id;

  const seenActors: WeakSet<xs.AnyActorRef> = new WeakSet();

  const eventSentInspector: xs.Observer<xs.InspectionEvent> = {
    complete: () => {
      inspectorObserver.complete?.();
      if (abortController.signal.aborted) {
        return;
      }
      if (expectedEventQueue.length) {
        reject(
          new Error(
            `Actor did not send event(s) before completion: ${expectedEventQueue.join(', ')}`,
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
        return;
      }

      if (evt.type === '@xstate.event' && expectedEventQueue.length) {
        const type = head(expectedEventQueue);

        if (matchesEventFromActor(evt, type)) {
          // in this type of event, the `actorRef` is a source actor and the `sourceRef` is a target
          if (!matchesTarget(evt.actorRef)) {
            return;
          }

          seenEvents.push(evt.event as EventFromEventType<Actor, typeof type>);
          expectedEventQueue.shift();

          if (!expectedEventQueue.length) {
            resolve(seenEvents);
          }
        }
      }
    },
  };

  attachActor(actor, {...opts, inspector: eventSentInspector});
  seenActors.add(actor);

  const expectedEventQueue = [...eventTypes];

  if (!expectedEventQueue.length) {
    throw new TypeError('Expected one or more event types');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const seenEvents: ActorEventTuple<Target, EventSentTypes> = [] as any;

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

const runUntilEventSent_ = createEventFn(true);

const waitForEventSent_ = createEventFn(false);

const runUntilEventSentWith_ = createEventSentWithFn(true);

const waitForEventSentWith_ = createEventSentWithFn(false);
