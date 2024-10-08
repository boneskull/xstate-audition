import * as xs from 'xstate';

import {createPatcher} from './actor.js';
import {applyDefaults} from './defaults.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {startTimer} from './timer.js';
import {
  type AnyStateMachineActor,
  type AuditionOptions,
  type InternalAuditionOptions,
  type ReadableArray,
} from './types.js';

/**
 * A tuple of events emitted by an actor matching `TEmittedTypes`.
 */
export type ActorEmittedTuple<
  TActor extends AnyStateMachineActor,
  TEmittedTypes extends Readonly<ActorEmittedTypeTuple<TActor>>,
> = {
  -readonly [K in keyof TEmittedTypes]: EmittedFromEmittedType<
    TActor,
    TEmittedTypes[K]
  >;
};

export type ActorEmittedType<TActor extends AnyStateMachineActor> =
  xs.EmittedFrom<TActor['logic']>['type'];

export type ActorEmittedTypeTuple<TActor extends AnyStateMachineActor> =
  ReadableArray<[ActorEmittedType<TActor>, ...ActorEmittedType<TActor>[]]>;

export type CurryEmitted = (() => CurryEmitted) &
  (<
    TActor extends AnyStateMachineActor,
    const TEmittedTypes extends Readonly<ActorEmittedTypeTuple<TActor>>,
  >(
    actor: TActor,
    emittedTypes: TEmittedTypes,
  ) => Promise<ActorEmittedTuple<TActor, TEmittedTypes>>) &
  (<TActor extends AnyStateMachineActor>(
    actor: TActor,
  ) => CurryEmittedP1<TActor>);

export type CurryEmittedP1<TActor extends AnyStateMachineActor> =
  (() => CurryEmittedP1<TActor>) &
    (<const TEmittedTypes extends ActorEmittedTypeTuple<TActor>>(
      emittedTypes: TEmittedTypes,
    ) => Promise<ActorEmittedTuple<TActor, TEmittedTypes>>);

export type CurryEmittedWith = (() => CurryEmittedWith) &
  (<
    TActor extends AnyStateMachineActor,
    const TEmittedTypes extends ActorEmittedTypeTuple<TActor>,
  >(
    actor: TActor,
    options: AuditionOptions,
    emittedTypes: TEmittedTypes,
  ) => Promise<ActorEmittedTuple<TActor, TEmittedTypes>>) &
  (<TActor extends AnyStateMachineActor>(
    actor: TActor,
    options: AuditionOptions,
  ) => CurryEmittedWithP2<TActor>) &
  (<TActor extends AnyStateMachineActor>(
    actor: TActor,
  ) => CurryEmittedWithP1<TActor>);

export type CurryEmittedWithP1<TActor extends AnyStateMachineActor> =
  (() => CurryEmittedWithP1<TActor>) &
    ((options: AuditionOptions) => CurryEmittedWithP2<TActor>) &
    (<const TEmittedTypes extends ActorEmittedTypeTuple<TActor>>(
      options: AuditionOptions,
      emittedTypes: TEmittedTypes,
    ) => Promise<ActorEmittedTuple<TActor, TEmittedTypes>>);

export type CurryEmittedWithP2<TActor extends AnyStateMachineActor> =
  (() => CurryEmittedWithP2<TActor>) &
    (<const TEmittedTypes extends ActorEmittedTypeTuple<TActor>>(
      emittedTypes: TEmittedTypes,
    ) => Promise<ActorEmittedTuple<TActor, TEmittedTypes>>);

/**
 * Given a State Machine TActor and a _emitted_
 * {@link xs.EventObject.type event type} (the `type` field of an `EventObject`),
 * returns the type of the corresponding event.
 *
 * @template TActor The State Machine TActor
 * @template EventType The _emitted_ event type (the `type` field of the
 *   `EventObject`)
 */
export type EmittedFromEmittedType<
  TActor extends AnyStateMachineActor,
  EventType extends ActorEmittedType<TActor>,
> = xs.ExtractEvent<xs.EmittedFrom<TActor['logic']>, EventType>;

export function runUntilEmitted<
  TActor extends AnyStateMachineActor,
  const TEmittedTypes extends ActorEmittedTypeTuple<TActor>,
>(
  actor: TActor,
  emittedTypes: TEmittedTypes,
): Promise<ActorEmittedTuple<TActor, TEmittedTypes>>;

export function runUntilEmitted<TActor extends AnyStateMachineActor>(
  actor: TActor,
): CurryEmittedP1<TActor>;

export function runUntilEmitted(): CurryEmitted;

export function runUntilEmitted<
  TActor extends AnyStateMachineActor,
  const TEmittedTypes extends ActorEmittedTypeTuple<TActor>,
>(actor?: TActor, emittedTypes?: TEmittedTypes) {
  return runUntilEmitted_(actor, emittedTypes);
}

export function runUntilEmittedWith(): CurryEmittedWith;

export function runUntilEmittedWith<TActor extends AnyStateMachineActor>(
  actor: TActor,
): CurryEmittedWithP1<TActor>;

export function runUntilEmittedWith<TActor extends AnyStateMachineActor>(
  actor: TActor,
  options: AuditionOptions,
): CurryEmittedWithP2<TActor>;

export function runUntilEmittedWith<
  TActor extends AnyStateMachineActor,
  const TEmittedTypes extends ActorEmittedTypeTuple<TActor>,
>(
  actor: TActor,
  options: AuditionOptions,
  emittedTypes: TEmittedTypes,
): Promise<ActorEmittedTuple<TActor, TEmittedTypes>>;

export function runUntilEmittedWith<
  TActor extends AnyStateMachineActor,
  const TEmittedTypes extends ActorEmittedTypeTuple<TActor>,
>(actor?: TActor, options?: AuditionOptions, events?: TEmittedTypes) {
  return runUntilEmittedWith_(actor, options, events);
}

/**
 * This function just returns itself.
 *
 * @returns This function
 */
export function waitForEmitted(): CurryEmitted;

/**
 * Waits for a State Machine TActor to emit one or more events (in order).
 *
 * @param actor A State Machine TActor
 * @returns A {@link CurryEmittedP1 function} accepting the emitted event types
 */
export function waitForEmitted<TActor extends AnyStateMachineActor>(
  actor: TActor,
): CurryEmittedP1<TActor>;

/**
 * Waits for a State Machine TActor to emit one or more events (in order).
 *
 * @param actor A State Machine TActor
 * @param emittedTypes One or more _emitted event types_ (the `type` field of
 *   the `EventObject`) to wait for (in order)
 * @returns `Promise` resolving with the matching events in their entirety
 *   (assuming they all occurred in order)
 */
export function waitForEmitted<
  TActor extends AnyStateMachineActor,
  const TEmittedTypes extends ActorEmittedTypeTuple<TActor>,
>(
  actor: TActor,
  emittedTypes: TEmittedTypes,
): Promise<ActorEmittedTuple<TActor, TEmittedTypes>>;

export function waitForEmitted<
  TActor extends AnyStateMachineActor,
  const TEmittedTypes extends ActorEmittedTypeTuple<TActor>,
>(actor?: TActor, events?: TEmittedTypes) {
  return waitForEmitted_(actor, events);
}

export function waitForEmittedWith(): CurryEmittedWith;

export function waitForEmittedWith<TActor extends AnyStateMachineActor>(
  actor: TActor,
): CurryEmittedWithP1<TActor>;

export function waitForEmittedWith<TActor extends AnyStateMachineActor>(
  actor: TActor,
  options: AuditionOptions,
): CurryEmittedWithP2<TActor>;

export function waitForEmittedWith<
  TActor extends AnyStateMachineActor,
  const TEmittedTypes extends ActorEmittedTypeTuple<TActor>,
>(
  actor: TActor,
  options: AuditionOptions,
  emittedTypes: TEmittedTypes,
): Promise<ActorEmittedTuple<TActor, TEmittedTypes>>;

export function waitForEmittedWith<
  TActor extends AnyStateMachineActor,
  const TEmittedTypes extends ActorEmittedTypeTuple<TActor>,
>(actor?: TActor, options?: AuditionOptions, emittedTypes?: TEmittedTypes) {
  return waitForEmittedWith_(actor, options, emittedTypes);
}

const createEmittedFn = (stop = false) => {
  const curryEmitted = <
    TActor extends AnyStateMachineActor,
    const TEmittedTypes extends ActorEmittedTypeTuple<TActor>,
  >(
    actor?: TActor,
    events?: TEmittedTypes,
  ) => {
    if (actor) {
      if (events) {
        return untilEmitted(actor, {stop}, events);
      }

      return ((events?: TEmittedTypes) =>
        events
          ? curryEmitted(actor, events)
          : curryEmitted(actor)) as CurryEmittedP1<TActor>;
    }

    return curryEmitted as CurryEmitted;
  };

  return curryEmitted;
};

const createEmittedWithFn = (stop = false) => {
  const curryEmittedWith = <
    TActor extends AnyStateMachineActor,
    const TEmittedTypes extends ActorEmittedTypeTuple<TActor>,
  >(
    actor?: TActor,
    options?: AuditionOptions,
    events?: TEmittedTypes,
  ) => {
    if (actor) {
      if (options) {
        if (events) {
          return untilEmitted(
            actor,
            {
              ...options,
              stop,
            },
            events,
          );
        }

        return ((events?: TEmittedTypes) => {
          return events
            ? curryEmittedWith(actor, options, events)
            : curryEmittedWith(actor, options);
        }) as CurryEmittedWithP2<TActor>;
      }

      return ((options?: AuditionOptions, events?: TEmittedTypes) => {
        if (options) {
          return events
            ? curryEmittedWith(actor, options, events)
            : curryEmittedWith(actor, options);
        }

        return curryEmittedWith(actor);
      }) as CurryEmittedWithP1<TActor>;
    }

    return curryEmittedWith as CurryEmittedWith;
  };

  return curryEmittedWith;
};

const untilEmitted = async <
  TActor extends AnyStateMachineActor,
  const TEmittedTypes extends ActorEmittedTypeTuple<TActor>,
>(
  actor: TActor,
  options: InternalAuditionOptions,
  emittedTypes: TEmittedTypes,
): Promise<ActorEmittedTuple<TActor, TEmittedTypes>> => {
  const opts = applyDefaults(options);

  const {inspector, stop, timeout} = opts;

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<ActorEmittedTuple<TActor, TEmittedTypes>>();

  const snapshotSubscription = actor.subscribe({
    error: (err) => {
      abortController.abort();
      reject(err);
    },
  });

  const inspectorObserver = xs.toObserver(inspector);

  const emittedInspector: xs.Observer<xs.InspectionEvent> = {
    complete: inspectorObserver.complete,
    error: inspectorObserver.error,
    next: (evt) => {
      inspectorObserver.next?.(evt);
      maybePatchActorRef(evt);
    },
  };

  /**
   * This listener looks for each desired event in order, recursively creating &
   * destroying subscriptions as it does so. Each event is pushed to
   * {@link emitted}, and when all have been accounted for, {@link promise} is
   * resolved with the array of events.
   */
  const subscribe = <T extends TEmittedTypes[number]>(
    type: T,
  ): xs.Subscription =>
    actor.on(type, (event: EmittedFromEmittedType<TActor, T>) => {
      eventSubscription?.unsubscribe();
      if (abortController.signal.aborted) {
        return;
      }
      emitted.push(event);

      const next = expectedEventQueue.shift();

      if (next) {
        eventSubscription = subscribe(next);
      } else {
        resolve(emitted);
      }
    });

  const expectedEventQueue = [...emittedTypes];

  if (!expectedEventQueue.length) {
    throw new TypeError('Expected one or more event types');
  }

  // this will eventually become the desired type if all goes well
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const emitted: ActorEmittedTuple<TActor, TEmittedTypes> = [] as any;

  const maybePatchActorRef = createPatcher({
    ...opts,
    inspector: emittedInspector,
  });

  maybePatchActorRef(actor);

  let eventSubscription = subscribe(expectedEventQueue.shift());

  startTimer(
    actor,
    abortController,
    timeout,
    `Event not emitted in ${timeout}ms`,
  );

  void xs.toPromise(actor).catch(reject);

  actor.start();

  try {
    return await promise;
  } finally {
    if (stop) {
      actor.stop();
    }
    snapshotSubscription.unsubscribe();
  }
};

const runUntilEmitted_ = createEmittedFn(true);

const runUntilEmittedWith_ = createEmittedWithFn(true);

const waitForEmitted_ = createEmittedFn(false);

const waitForEmittedWith_ = createEmittedWithFn(false);
