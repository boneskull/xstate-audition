import type * as xs from 'xstate';

import {type ActorThenable, type AuditionOptions} from './types.js';
import {noop} from './util.js';

/**
 * Sets up an existing `Actor` with a logger and inspector.
 *
 * @param actor Actor
 * @param options Options for instrumentation
 * @returns Instrumented actor
 * @internal
 */
export function attachActor<Ref extends xs.AnyActor>(
  actor: Ref,
  {inspector: inspect = noop, logger = noop}: AuditionOptions = {},
): Ref {
  actor.system.inspect(inspect);
  // @ts-expect-error private
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  actor.logger = actor._actorScope.logger = logger;
  return actor;
}

/**
 * Creates an {@link ActorThenable} from an `Actor` and a {@link Promise}.
 *
 * @param actor An `Actor` or an `ActorThenable`
 * @param promise Any `Promise`
 * @returns An `Actor` which is also a thenable
 * @internal
 */
export function createActorThenable<
  Logic extends xs.AnyActorLogic,
  Actor extends xs.Actor<Logic>,
  Out = void,
>(
  actor: Actor | ActorThenable<Logic, Out>,
  promise: Promise<Out>,
): ActorThenable<Logic, Out> {
  const isThenable = (
    actor: Actor | ActorThenable<Logic, Out>,
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
