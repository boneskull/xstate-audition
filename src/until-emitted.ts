import * as xs from 'xstate';

import {attachActor} from './actor.js';
import {applyDefaults} from './defaults.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {startTimer} from './timer.js';
import {
  type AnyStateMachineActor,
  type AuditionOptions,
  type InternalAuditionOptions,
} from './types.js';

export type ActorEmittedTuple<
  Actor extends AnyStateMachineActor,
  EmittedTypes extends Readonly<ActorEmittedTypeTuple<Actor>>,
> = {
  -readonly [K in keyof EmittedTypes]: EmittedFromEmittedType<
    Actor,
    EmittedTypes[K]
  >;
};

type ActorEmittedType<Actor extends AnyStateMachineActor> = xs.EmittedFrom<
  Actor['logic']
>['type'];

export type ActorEmittedTypeTuple<Actor extends AnyStateMachineActor> =
  | [ActorEmittedType<Actor>, ...ActorEmittedType<Actor>[]]
  | readonly [ActorEmittedType<Actor>, ...ActorEmittedType<Actor>[]];

export type CurryEmitted = (() => CurryEmitted) &
  (<
    Actor extends AnyStateMachineActor,
    const EmittedTypes extends Readonly<ActorEmittedTypeTuple<Actor>>,
  >(
    actor: Actor,
    emittedTypes: EmittedTypes,
  ) => Promise<ActorEmittedTuple<Actor, EmittedTypes>>) &
  (<Actor extends AnyStateMachineActor>(actor: Actor) => CurryEmittedP1<Actor>);

export type CurryEmittedP1<Actor extends AnyStateMachineActor> =
  (() => CurryEmittedP1<Actor>) &
    (<const EmittedTypes extends ActorEmittedTypeTuple<Actor>>(
      emittedTypes: EmittedTypes,
    ) => Promise<ActorEmittedTuple<Actor, EmittedTypes>>);

export type CurryEmittedWith = (() => CurryEmittedWith) &
  (<
    Actor extends AnyStateMachineActor,
    const EmittedTypes extends ActorEmittedTypeTuple<Actor>,
  >(
    actor: Actor,
    options: AuditionOptions,
    emittedTypes: EmittedTypes,
  ) => Promise<ActorEmittedTuple<Actor, EmittedTypes>>) &
  (<Actor extends AnyStateMachineActor>(
    actor: Actor,
    options: AuditionOptions,
  ) => CurryEmittedWithP2<Actor>) &
  (<Actor extends AnyStateMachineActor>(
    actor: Actor,
  ) => CurryEmittedWithP1<Actor>);

export type CurryEmittedWithP1<Actor extends AnyStateMachineActor> = ((
  options: AuditionOptions,
) => CurryEmittedWithP2<Actor>) &
  (() => CurryEmittedWithP1<Actor>) &
  (<const EmittedTypes extends ActorEmittedTypeTuple<Actor>>(
    options: AuditionOptions,
    emittedTypes: EmittedTypes,
  ) => Promise<ActorEmittedTuple<Actor, EmittedTypes>>);

export type CurryEmittedWithP2<Actor extends AnyStateMachineActor> =
  (() => CurryEmittedWithP2<Actor>) &
    (<const EmittedTypes extends ActorEmittedTypeTuple<Actor>>(
      emittedTypes: EmittedTypes,
    ) => Promise<ActorEmittedTuple<Actor, EmittedTypes>>);

type EmittedFromEmittedType<
  Actor extends AnyStateMachineActor,
  K extends ActorEmittedType<Actor>,
> = xs.ExtractEvent<xs.EmittedFrom<Actor['logic']>, K>;

export function runUntilEmitted<
  Actor extends AnyStateMachineActor,
  const EmittedTypes extends ActorEmittedTypeTuple<Actor>,
>(
  actor: Actor,
  emittedTypes: EmittedTypes,
): Promise<ActorEmittedTuple<Actor, EmittedTypes>>;

export function runUntilEmitted<Actor extends AnyStateMachineActor>(
  actor: Actor,
): CurryEmittedP1<Actor>;

export function runUntilEmitted(): CurryEmitted;

export function runUntilEmitted<
  Actor extends AnyStateMachineActor,
  const EmittedTypes extends ActorEmittedTypeTuple<Actor>,
>(actor?: Actor, emittedTypes?: EmittedTypes) {
  return runUntilEmitted_(actor, emittedTypes);
}

export function runUntilEmittedWith(): CurryEmittedWith;

export function runUntilEmittedWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
): CurryEmittedWithP1<Actor>;

export function runUntilEmittedWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: AuditionOptions,
): CurryEmittedWithP2<Actor>;

export function runUntilEmittedWith<
  Actor extends AnyStateMachineActor,
  const EmittedTypes extends ActorEmittedTypeTuple<Actor>,
>(
  actor: Actor,
  options: AuditionOptions,
  emittedTypes: EmittedTypes,
): Promise<ActorEmittedTuple<Actor, EmittedTypes>>;

export function runUntilEmittedWith<
  Actor extends AnyStateMachineActor,
  const EmittedTypes extends ActorEmittedTypeTuple<Actor>,
>(actor?: Actor, options?: AuditionOptions, events?: EmittedTypes) {
  return runUntilEmittedWith_(actor, options, events);
}

/**
 * Waits for an actor to emit one or more events (in order).
 *
 * Returns a combination of a `Promise` and an `Actor` so that events may be
 * sent to the actor to trigger its behavior.
 *
 * @param events One or more _event names_ (the `type` field) to wait for (in
 *   order)
 * @param actor An existing {@link xs.Actor}
 * @returns An {@link ActorThenable} which fulfills with the matching events
 *   (assuming they all occurred in order)
 */
export function waitForEmitted(): CurryEmitted;

export function waitForEmitted<Actor extends AnyStateMachineActor>(
  actor: Actor,
): CurryEmittedP1<Actor>;

export function waitForEmitted<
  Actor extends AnyStateMachineActor,
  const EmittedTypes extends ActorEmittedTypeTuple<Actor>,
>(
  actor: Actor,
  emittedTypes: EmittedTypes,
): Promise<ActorEmittedTuple<Actor, EmittedTypes>>;

export function waitForEmitted<
  Actor extends AnyStateMachineActor,
  const EmittedTypes extends ActorEmittedTypeTuple<Actor>,
>(actor?: Actor, events?: EmittedTypes) {
  return waitForEmitted_(actor, events);
}

export function waitForEmittedWith(): CurryEmittedWith;

export function waitForEmittedWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
): CurryEmittedWithP1<Actor>;

export function waitForEmittedWith<Actor extends AnyStateMachineActor>(
  actor: Actor,
  options: AuditionOptions,
): CurryEmittedWithP2<Actor>;

export function waitForEmittedWith<
  Actor extends AnyStateMachineActor,
  const EmittedTypes extends ActorEmittedTypeTuple<Actor>,
>(
  actor: Actor,
  options: AuditionOptions,
  emittedTypes: EmittedTypes,
): Promise<ActorEmittedTuple<Actor, EmittedTypes>>;

export function waitForEmittedWith<
  Actor extends AnyStateMachineActor,
  const EmittedTypes extends ActorEmittedTypeTuple<Actor>,
>(actor?: Actor, options?: AuditionOptions, emittedTypes?: EmittedTypes) {
  return waitForEmittedWith_(actor, options, emittedTypes);
}

const createEmittedFn = (stop = false) => {
  const curryEmitted = <
    Actor extends AnyStateMachineActor,
    const EmittedTypes extends ActorEmittedTypeTuple<Actor>,
  >(
    actor?: Actor,
    events?: EmittedTypes,
  ) => {
    if (actor) {
      if (events) {
        return untilEmitted(actor, {stop}, events);
      }

      return ((events?: EmittedTypes) =>
        events
          ? curryEmitted(actor, events)
          : curryEmitted(actor)) as CurryEmittedP1<Actor>;
    }

    return curryEmitted as CurryEmitted;
  };

  return curryEmitted;
};

const createEmittedWithFn = (stop = false) => {
  const curryEmittedWith = <
    Actor extends AnyStateMachineActor,
    const EmittedTypes extends ActorEmittedTypeTuple<Actor>,
  >(
    actor?: Actor,
    options?: AuditionOptions,
    events?: EmittedTypes,
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

        return ((events?: EmittedTypes) => {
          return events
            ? curryEmittedWith(actor, options, events)
            : curryEmittedWith(actor, options);
        }) as CurryEmittedWithP2<Actor>;
      }

      return ((options?: AuditionOptions, events?: EmittedTypes) => {
        if (options) {
          return events
            ? curryEmittedWith(actor, options, events)
            : curryEmittedWith(actor, options);
        }

        return curryEmittedWith(actor);
      }) as CurryEmittedWithP1<Actor>;
    }

    return curryEmittedWith as CurryEmittedWith;
  };

  return curryEmittedWith;
};

const untilEmitted = async <
  Actor extends AnyStateMachineActor,
  const EmittedTypes extends ActorEmittedTypeTuple<Actor>,
>(
  actor: Actor,
  options: InternalAuditionOptions,
  emittedTypes: EmittedTypes,
): Promise<ActorEmittedTuple<Actor, EmittedTypes>> => {
  const opts = applyDefaults(options);

  const {inspector, logger, stop, timeout} = opts;

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<ActorEmittedTuple<Actor, EmittedTypes>>();

  const snapshotSubscription = actor.subscribe({
    error: (err) => {
      abortController.abort();
      reject(err);
    },
  });

  const inspectorObserver = xs.toObserver(inspector);

  const seenActors: WeakSet<xs.AnyActorRef> = new WeakSet();

  const emittedInspector: xs.Observer<xs.InspectionEvent> = {
    complete: inspectorObserver.complete,
    error: inspectorObserver.error,
    next: (evt) => {
      inspectorObserver.next?.(evt);
      if (!seenActors.has(evt.actorRef)) {
        attachActor(evt.actorRef, {logger});
        seenActors.add(evt.actorRef);
      }
    },
  };

  /**
   * This listener looks for each desired event in order, recursively creating &
   * destroying subscriptions as it does so. Each event is pushed to
   * {@link emitted}, and when all have been accounted for, {@link promise} is
   * resolved with the array of events.
   */
  const subscribe = <T extends EmittedTypes[number]>(
    type: T,
  ): xs.Subscription =>
    actor.on(type, (event: EmittedFromEmittedType<Actor, T>) => {
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
  const emitted: ActorEmittedTuple<Actor, EmittedTypes> = [] as any;

  attachActor(actor, {...opts, inspector: emittedInspector});

  let eventSubscription = subscribe(expectedEventQueue.shift());

  startTimer(abortController, timeout, `Event not emitted in ${timeout}ms`);

  actor.start();

  try {
    return await promise;
  } catch (err) {
    actor.stop();
    throw err;
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
