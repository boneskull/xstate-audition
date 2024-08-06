import {type Actor, type ActorLogicFrom, type AnyActorRef} from 'xstate';

import {type ActorThenable, type AuditionOptions} from './types.js';
import {noop} from './util.js';

/**
 * Sets up an existing `Actor` with a logger and inspector.
 *
 * @param actorRef Actor
 * @param options Options for instrumentation
 * @returns Instrumented actor
 * @internal
 */
export function attachActor<Ref extends AnyActorRef>(
  actorRef: Ref,
  {inspector: inspect = noop, logger = noop}: AuditionOptions = {},
): Ref {
  actorRef.system.inspect(inspect);
  // @ts-expect-error private
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  actorRef.logger = actorRef._actorScope.logger = logger;
  return actorRef;
}

/**
 * Creates an {@link ActorThenable} from an {@link Actor} and a {@link Promise}.
 *
 * @param actor An `Actor` or an `ActorThenable`
 * @param promise Any `Promise`
 * @returns An `Actor` which is also a thenable
 * @internal
 */
export function createActorThenable<
  Ref extends AnyActorRef,
  Logic extends ActorLogicFrom<Ref>,
  Out = void,
>(
  actor: ActorThenable<Logic, Out> | Ref,
  promise: Promise<Out>,
): ActorThenable<Logic, Out> {
  const isThenable = (
    actor: ActorThenable<Logic, Out> | Ref,
  ): actor is ActorThenable<Logic, Out> =>
    'then' in actor && 'catch' in actor && 'finally' in actor;

  // there are myriad ways to do this, and here is one.
  return new Proxy(actor, {
    get: (target, prop, receiver) => {
      switch (prop) {
        case 'catch':
        case 'finally':
        case 'then':
          return isThenable(target)
            ? target[prop]
            : // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              (...args: any[]) => promise[prop].call(promise, ...args);
        default:
          return Reflect.get(target, prop, receiver);
      }
    },
  }) as ActorThenable<Logic, Out>;
}
