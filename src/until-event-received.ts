import * as xs from 'xstate';

import {createPatcher} from './actor.js';
import {XSTATE_EVENT} from './constants.js';
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
import {head, isActorRef} from './util.js';

export type CurryEventReceived = (() => CurryEventReceived) &
  (<
    TActor extends AnyEventReceiverActor,
    const TEventTypes extends ActorEventTypeTuple<TActor>,
  >(
    actor: TActor,
    eventTypes: TEventTypes,
  ) => CurryEventReceivedP2<TActor, TEventTypes>) &
  (<TActor extends AnyEventReceiverActor>(
    actor: TActor,
  ) => CurryEventReceivedP1<TActor>);

export type CurryEventReceivedP1<TActor extends AnyEventReceiverActor> =
  (() => CurryEventReceivedP1<TActor>) &
    (<const TEventTypes extends ActorEventTypeTuple<TActor>>(
      eventTypes: TEventTypes,
    ) => CurryEventReceivedP2<TActor, TEventTypes>);

export type CurryEventReceivedP2<
  TActor extends AnyEventReceiverActor,
  TEventTypes extends ActorEventTypeTuple<TActor>,
> = Promise<ActorEventTuple<TActor, TEventTypes>>;

export type CurryEventReceivedWith = (() => CurryEventReceivedWith) &
  (<
    TActor extends AnyEventReceiverActor,
    const TEventTypes extends ActorEventTypeTuple<TActor>,
  >(
    actor: TActor,
    options: AuditionOptions,
    eventTypes: TEventTypes,
  ) => CurryEventReceivedWithP3<TActor, TEventTypes>) &
  (<TActor extends AnyEventReceiverActor>(
    actor: TActor,
    options: AuditionEventOptions,
  ) => CurryEventReceivedWithP2<TActor>) &
  (<TActor extends AnyEventReceiverActor>(
    actor: TActor,
  ) => CurryEventReceivedWithP1<TActor>);

export type CurryEventReceivedWithP1<TActor extends AnyEventReceiverActor> =
  (() => CurryEventReceivedWithP1<TActor>) &
    ((options: AuditionEventOptions) => CurryEventReceivedWithP2<TActor>) &
    (<const TEventTypes extends ActorEventTypeTuple<TActor>>(
      options: AuditionOptions,
      eventTypes: TEventTypes,
    ) => CurryEventReceivedWithP3<TActor, TEventTypes>);

export type CurryEventReceivedWithP2<TActor extends AnyEventReceiverActor> =
  (() => CurryEventReceivedWithP2<TActor>) &
    (<const TEventTypes extends ActorEventTypeTuple<TActor>>(
      eventTypes: TEventTypes,
    ) => CurryEventReceivedWithP3<TActor, TEventTypes>);

export type CurryEventReceivedWithP3<
  TActor extends AnyEventReceiverActor,
  TEventTypes extends ActorEventTypeTuple<TActor>,
> = Promise<ActorEventTuple<TActor, TEventTypes>>;

/**
 * Runs an XState `Actor` until it receives one or more events (in order).
 *
 * @template TActor The type of `actor`
 * @template TEventTypes The type of `eventTypes`
 * @param actor An XState `Actor` that can receive events
 * @param eventTypes One or more _event names_ (the `type` field) to wait for
 *   (in order)
 * @returns A `Promise` fulfilling with the matching events (assuming they all
 *   occurred in order)
 */
export function runUntilEventReceived<
  TActor extends AnyEventReceiverActor,
  const TEventTypes extends ActorEventTypeTuple<TActor>,
>(
  actor: TActor,
  eventTypes: TEventTypes,
): CurryEventReceivedP2<TActor, TEventTypes>;

/**
 * Returns a function which runs an actor until it sends one or more events (in
 * order).
 *
 * @template TActor The type of `actor`
 * @param actor An XState `Actor` that can receive events
 * @returns A function which runs an actor until it sends one or more events (in
 *   order)
 */
export function runUntilEventReceived<TActor extends AnyEventReceiverActor>(
  actor: TActor,
): CurryEventReceivedP1<TActor>;

/**
 * Returns itself.
 *
 * @returns A function which returns itself
 */
export function runUntilEventReceived(): CurryEventReceived;

export function runUntilEventReceived<
  TActor extends AnyEventReceiverActor,
  const TEventTypes extends ActorEventTypeTuple<TActor>,
>(actor?: TActor, events?: TEventTypes) {
  return runUntilEventReceived_(actor, events);
}

export function runUntilEventReceivedWith(): CurryEventReceivedWith;

export function runUntilEventReceivedWith<TActor extends AnyEventReceiverActor>(
  actor: TActor,
): CurryEventReceivedWithP1<TActor>;

export function runUntilEventReceivedWith<TActor extends AnyEventReceiverActor>(
  actor: TActor,
  options: AuditionEventOptions,
): CurryEventReceivedWithP2<TActor>;

export function runUntilEventReceivedWith<
  TActor extends AnyEventReceiverActor,
  const TEventTypes extends ActorEventTypeTuple<TActor>,
>(
  actor: TActor,
  options: AuditionOptions,
  eventTypes: TEventTypes,
): CurryEventReceivedWithP3<TActor, TEventTypes>;

export function runUntilEventReceivedWith<
  TActor extends AnyEventReceiverActor,
  const TEventTypes extends ActorEventTypeTuple<TActor>,
>(actor?: TActor, options?: AuditionOptions, events?: TEventTypes) {
  return runUntilEventReceivedWith_(actor, options, events);
}

export function waitForEventReceived(): CurryEventReceived;

export function waitForEventReceived<TActor extends AnyEventReceiverActor>(
  actor: TActor,
): CurryEventReceivedP1<TActor>;

export function waitForEventReceived<
  TActor extends AnyEventReceiverActor,
  const TEventTypes extends ActorEventTypeTuple<TActor>,
>(
  actor: TActor,
  eventTypes: TEventTypes,
): CurryEventReceivedP2<TActor, TEventTypes>;

export function waitForEventReceived<
  TActor extends AnyEventReceiverActor,
  const TEventTypes extends ActorEventTypeTuple<TActor>,
>(actor?: TActor, events?: TEventTypes) {
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
 * @template TActor The type of `actor`
 * @param actor An XState `Actor` that can receive events
 * @returns Returns a function which, if provided
 *   {@link AuditionEventOptions options} and
 *   {@link ActorEventTypeTuple event types}, will waits until an XState `Actor`
 *   receives one or more events (in order).
 */
export function waitForEventReceivedWith<TActor extends AnyEventReceiverActor>(
  actor: TActor,
): CurryEventReceivedWithP1<TActor>;

/**
 * Returns a function which waits until an XState `Actor` receives one or more
 * events (in order).
 *
 * @template TActor The type of `actor`
 * @param actor An XState `Actor` that can receive events
 * @param options Options, including `otherActorId` which will filter on the
 *   sender
 * @returns A `Promise` fulfilling with the matching events (assuming they all
 *   occurred in order)
 */
export function waitForEventReceivedWith<TActor extends AnyEventReceiverActor>(
  actor: TActor,
  options: AuditionEventOptions,
): CurryEventReceivedWithP2<TActor>;

/**
 * Wait until an XState `Actor` receives one or more events (in order).
 *
 * @template TActor The type of `actor`
 * @template TEventTypes The type of `eventTypes`
 * @param actor An XState `Actor` that can receive events
 * @param options Options, including `otherActorId` which will filter on the
 *   sender
 * @param eventTypes One or more _event names_ (the `type` field) to wait for
 *   (in order)
 * @returns A `Promise` fulfilling with the matching events (assuming they all
 *   occurred in order)
 */
export function waitForEventReceivedWith<
  TActor extends AnyEventReceiverActor,
  const TEventTypes extends ActorEventTypeTuple<TActor>,
>(
  actor: TActor,
  options: AuditionOptions,
  eventTypes: TEventTypes,
): CurryEventReceivedWithP3<TActor, TEventTypes>;

export function waitForEventReceivedWith<
  TActor extends AnyEventReceiverActor,
  const TEventTypes extends ActorEventTypeTuple<TActor>,
>(actor?: TActor, options?: AuditionOptions, events?: TEventTypes) {
  return waitForEventReceivedWith_(actor, options, events);
}

const createEventFn = (stop = false) => {
  const curryEvent = <
    TActor extends AnyEventReceiverActor,
    const TEventTypes extends ActorEventTypeTuple<TActor>,
  >(
    actor?: TActor,
    events?: TEventTypes,
  ) => {
    if (actor) {
      if (events) {
        return untilEventReceived(actor, {stop}, events);
      }

      return ((events?: TEventTypes) =>
        events
          ? curryEvent(actor, events)
          : curryEvent(actor)) as CurryEventReceivedP1<TActor>;
    }

    return curryEvent as CurryEventReceived;
  };

  return curryEvent;
};

const createEventReceivedWithFn = (stop = false) => {
  const curryEventReceivedWith = <
    TActor extends AnyEventReceiverActor,
    const TEventTypes extends ActorEventTypeTuple<TActor>,
  >(
    actor?: TActor,
    options?: AuditionOptions,
    events?: TEventTypes,
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

        return ((events?: TEventTypes) => {
          return events
            ? curryEventReceivedWith(actor, options, events)
            : curryEventReceivedWith(actor, options);
        }) as CurryEventReceivedWithP2<TActor>;
      }

      return ((options?: AuditionOptions, events?: TEventTypes) => {
        if (options) {
          return events
            ? curryEventReceivedWith(actor, options, events)
            : curryEventReceivedWith(actor, options);
        }

        return curryEventReceivedWith(actor);
      }) as CurryEventReceivedWithP1<TActor>;
    }

    return curryEventReceivedWith as CurryEventReceivedWith;
  };

  return curryEventReceivedWith;
};

const untilEventReceived = async <
  TActor extends AnyEventReceiverActor,
  const TEventTypes extends ActorEventTypeTuple<TActor>,
>(
  actor: TActor,
  options: InternalAuditionEventOptions,
  eventTypes: TEventTypes,
): Promise<ActorEventTuple<TActor, TEventTypes>> => {
  const {id} = actor;

  const opts = applyDefaults(options);

  const {inspector, otherActorId, stop, timeout} = opts;

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<ActorEventTuple<TActor, TEventTypes>>();

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
    type: TEventTypes[number],
  ): evt is xs.InspectedEventEvent =>
    isActorRef(evt.actorRef) &&
    evt.type === XSTATE_EVENT &&
    type === evt.event.type &&
    evt.actorRef.id === id;

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

      maybePatchActorRef(evt);

      if (abortController.signal.aborted) {
        return;
      }

      if (evt.type === XSTATE_EVENT && expectedEventQueue.length) {
        const type = head(expectedEventQueue);

        if (matchesEventToActor(evt, type)) {
          // in this type of event, the `actorRef` is a target actor and the `sourceRef` is a source
          if (!matchesTarget(evt.sourceRef)) {
            return;
          }

          seenEvents.push(evt.event as EventFromEventType<TActor, typeof type>);
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

  const maybePatchActorRef = createPatcher({
    ...opts,
    inspector: eventReceivedInspector,
  });

  maybePatchActorRef(actor);

  const expectedEventQueue = [...eventTypes];

  if (!expectedEventQueue.length) {
    throw new TypeError('Expected one or more event types');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const seenEvents: ActorEventTuple<TActor, TEventTypes> = [] as any;

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
