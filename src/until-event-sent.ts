import * as xs from 'xstate';

import {createPatcher} from './actor.js';
import {XSTATE_EVENT} from './constants.js';
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
import {head, isActorRef} from './util.js';

export type CurryEventSent = (() => CurryEventSent) &
  (<Actor extends AnyActor>(actor: Actor) => CurryEventSentP1<Actor>) &
  (<
    TActor extends AnyActor,
    TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
    const TEventTypes extends
      ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
  >(
    actor: TActor,
    eventTypes: TEventTypes,
  ) => CurryEventSentP2<TReceiver, TEventTypes>);

export type CurryEventSentP1<
  TActor extends AnyActor,
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
> = (() => CurryEventSentP1<TActor, TReceiver>) &
  (<
    const TEventTypes extends
      ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
  >(
    eventTypes: TEventTypes,
  ) => CurryEventSentP2<TReceiver, TEventTypes>);

export type CurryEventSentP2<
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
  TEventTypes extends
    ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
> = Promise<ActorEventTuple<TReceiver, TEventTypes>>;

export type CurryEventSentWith = (() => CurryEventSentWith) &
  (<
    TActor extends AnyActor,
    TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
  >(
    actor: TActor,
    options: AuditionEventOptions,
  ) => CurryEventSentWithP2<TActor, TReceiver>) &
  (<
    TActor extends AnyActor,
    TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
    const TEventTypes extends
      ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
  >(
    actor: TActor,
    options: AuditionEventOptions,
    eventTypes: TEventTypes,
  ) => CurryEventSentWithP3<TReceiver, TEventTypes>) &
  (<TActor extends AnyActor>(actor: TActor) => CurryEventSentWithP1<TActor>);

export type CurryEventSentWithP1<TActor extends AnyActor> =
  (() => CurryEventSentWithP1<TActor>) &
    ((options: AuditionEventOptions) => CurryEventSentWithP2<TActor>) &
    (<
      TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
      const TEventTypes extends
        ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
    >(
      options: AuditionEventOptions,
      eventTypes: TEventTypes,
    ) => CurryEventSentWithP3<TReceiver, TEventTypes>);

export type CurryEventSentWithP2<
  TActor extends AnyActor,
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
> = (() => CurryEventSentWithP2<TActor, TReceiver>) &
  (<
    const TEventTypes extends
      ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
  >(
    eventTypes: TEventTypes,
  ) => CurryEventSentWithP3<TReceiver, TEventTypes>);

export type CurryEventSentWithP3<
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
  TEventTypes extends
    ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
> = Promise<ActorEventTuple<TReceiver, TEventTypes>>;

/**
 * Returns itself.
 */
export function runUntilEventSent(): CurryEventSent;

/**
 * Returns a function accepting an array of one or more _event types_ which
 * resolves with the matching events.
 *
 * @param actor An existing `Actor`
 * @returns A function accepting an array of one or more _event types_ which
 *   resolves with the matching events
 */
export function runUntilEventSent<
  TActor extends AnyActor,
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
>(actor: TActor): CurryEventSentP1<TActor, TReceiver>;

/**
 * Runs an {@link xs.Actor} until it sends one or more events (in order).
 *
 * @param actor An existing `Actor`
 * @param eventTypes One or more _event types_ (the `type` field of an
 *   {@link xs.EventObject EventObject}) to wait for (in order)
 * @returns The matching events (assuming they all occurred in order)
 */
export function runUntilEventSent<
  TActor extends AnyActor,
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
  const TEventTypes extends
    ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
>(
  actor: TActor,
  eventTypes: TEventTypes,
): CurryEventSentP2<TReceiver, TEventTypes>;

export function runUntilEventSent<
  TActor extends AnyActor,
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
  const TEventTypes extends
    ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
>(actor?: TActor, eventTypes?: TEventTypes) {
  return runUntilEventSent_(actor, eventTypes);
}

export function runUntilEventSentWith(): CurryEventSentWith;

export function runUntilEventSentWith<TActor extends AnyActor>(
  actor: TActor,
): CurryEventSentWithP1<TActor>;

export function runUntilEventSentWith<TActor extends AnyActor>(
  actor: TActor,
  options: AuditionEventOptions,
): CurryEventSentWithP2<TActor>;

export function runUntilEventSentWith<
  TActor extends AnyActor,
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
  const TEventTypes extends
    ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
>(
  actor: TActor,
  options: AuditionEventOptions,
  eventTypes: TEventTypes,
): CurryEventSentWithP3<TReceiver, TEventTypes>;

export function runUntilEventSentWith<
  TActor extends AnyActor,
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
  const TEventTypes extends
    ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
>(actor?: TActor, options?: AuditionEventOptions, events?: TEventTypes) {
  return runUntilEventSentWith_(actor, options, events);
}

/**
 * Returns itself
 */
export function waitForEventSent(): CurryEventSent;

/**
 * Returns a function which accepts one or more _event types_ and resolves once
 * the actor sends one or more events (in order).
 *
 * @param actor An existing {@link xs.Actor}
 * @returns A function which accepts one or more _event types_ and resolves once
 *   the actor sends one or more events (in order).
 */
export function waitForEventSent<TActor extends AnyActor>(
  actor: TActor,
): CurryEventSentP1<TActor>;

/**
 * Resolves once the actor sends one or more events (in order).
 *
 * @template TActor The type of the actor
 * @template TReceiver The type of the receiver actor
 * @template TEventTypes The type of the event types
 * @param actor An existing {@link xs.Actor}
 * @param eventTypes One or more _event types_ (the {@link xs.EventObject.type}
 *   field)
 */
export function waitForEventSent<
  TActor extends AnyActor,
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
  const TEventTypes extends
    ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
>(
  actor: TActor,
  eventTypes: TEventTypes,
): CurryEventSentP2<TReceiver, TEventTypes>;

export function waitForEventSent<
  TActor extends AnyActor,
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
  const TEventTypes extends
    ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
>(actor?: TActor, events?: TEventTypes) {
  return waitForEventSent_(actor, events);
}

/**
 * Returns itself
 */
export function waitForEventSentWith(): CurryEventSentWith;

/**
 * Returns a function which accepts options and/or one or more _event types_.
 *
 * If event types are provided, the function runs an actor until it sends one or
 * more events (in order); otherwise it returns a function which accepts one or
 * more _event types_ and returns a function which runs an actor until it sends
 * one or more events (in order).
 *
 * @param actor An existing {@link xs.Actor}
 */
export function waitForEventSentWith<TActor extends AnyActor>(
  actor: TActor,
): CurryEventSentWithP1<TActor>;

/**
 * Returns a function which accepts one or more _event types_ and runs an actor
 * until it sends one or more events (in order), with options including a target
 * actor ID.
 *
 * @param actor An existing {@link xs.Actor}
 * @param options Options
 * @returns A function which accepts one or more _event types_ and runs an actor
 *   until it sends one or more events (in order)
 */
export function waitForEventSentWith<TActor extends AnyActor>(
  actor: TActor,
  options: AuditionEventOptions,
): CurryEventSentWithP2<TActor>;

/**
 * Runs an actor until it sends one or more events (in order), with options
 * including a target actor ID.
 *
 * @param actor An existing {@link xs.Actor}
 * @param options Options
 * @param eventTypes One or more _event types_ (the {@link xs.EventObject.type}
 *   field) to wait for (in order)
 * @returns The matching events (assuming they all occurred in order)
 */
export function waitForEventSentWith<
  TActor extends AnyActor,
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
  const TEventTypes extends
    ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
>(
  actor: TActor,
  options: AuditionEventOptions,
  eventTypes: TEventTypes,
): CurryEventSentWithP3<TReceiver, TEventTypes>;

export function waitForEventSentWith<
  TActor extends AnyActor,
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
  const TEventTypes extends
    ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
>(actor?: TActor, options?: AuditionEventOptions, events?: TEventTypes) {
  return waitForEventSentWith_(actor, options, events);
}

const createEventFn = (stop = false) => {
  const curryEvent = <
    TActor extends AnyActor,
    TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
    const TEventTypes extends
      ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
  >(
    actor?: TActor,
    events?: TEventTypes,
  ) => {
    if (actor) {
      if (events) {
        return untilEventSent(actor, {stop}, events);
      }

      return ((events?: TEventTypes) =>
        events
          ? curryEvent(actor, events)
          : curryEvent(actor)) as CurryEventSentP1<TActor, TReceiver>;
    }

    return curryEvent as CurryEventSent;
  };

  return curryEvent;
};

const createEventSentWithFn = (stop = false) => {
  const curryEventSentWith = <
    TActor extends AnyActor,
    TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
    const TEventTypes extends
      ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
  >(
    actor?: TActor,
    options?: AuditionEventOptions,
    events?: TEventTypes,
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

        return ((events?: TEventTypes) => {
          return events
            ? curryEventSentWith(actor, options, events)
            : curryEventSentWith(actor, options);
        }) as CurryEventSentWithP2<TActor>;
      }

      return ((options?: AuditionEventOptions, events?: TEventTypes) => {
        if (options) {
          return events
            ? curryEventSentWith(actor, options, events)
            : curryEventSentWith(actor, options);
        }

        return curryEventSentWith(actor);
      }) as CurryEventSentWithP1<TActor>;
    }

    return curryEventSentWith as CurryEventSentWith;
  };

  return curryEventSentWith;
};

const untilEventSent = async <
  TActor extends AnyActor,
  TReceiver extends AnyEventReceiverActor = AnyEventReceiverActor,
  const TEventTypes extends
    ActorEventTypeTuple<TReceiver> = ActorEventTypeTuple<TReceiver>,
>(
  actor: TActor,
  options: InternalAuditionEventOptions,
  eventTypes: TEventTypes,
): Promise<ActorEventTuple<TReceiver, TEventTypes>> => {
  const {id} = actor;

  const opts = applyDefaults(options);

  const {inspector, otherActorId, stop, timeout} = opts;

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<ActorEventTuple<TReceiver, TEventTypes>>();

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
    type: TEventTypes[number],
  ): evt is xs.InspectedEventEvent =>
    !!(
      evt.type === XSTATE_EVENT &&
      isActorRef(evt.sourceRef) &&
      evt.sourceRef.id === id &&
      type === evt.event.type
    );

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

      maybePatchActorRef(evt);

      if (abortController.signal.aborted) {
        return;
      }

      if (evt.type === XSTATE_EVENT && expectedEventQueue.length) {
        const type = head(expectedEventQueue);

        if (isActorRef(evt.actorRef) && matchesEventFromActor(evt, type)) {
          // in this type of event, the `actorRef` is a source actor and the `sourceRef` is a target
          if (!matchesTarget(evt.actorRef)) {
            return;
          }

          seenEvents.push(evt.event as EventFromEventType<TActor, typeof type>);
          expectedEventQueue.shift();

          if (!expectedEventQueue.length) {
            resolve(seenEvents);
          }
        }
      }
    },
  };

  const maybePatchActorRef = createPatcher({
    ...opts,
    inspector: eventSentInspector,
  });

  maybePatchActorRef(actor);

  const expectedEventQueue = [...eventTypes];

  if (!expectedEventQueue.length) {
    throw new TypeError('Expected one or more event types');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const seenEvents: ActorEventTuple<TReceiver, TEventTypes> = [] as any;

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
