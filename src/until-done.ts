import * as xs from 'xstate';

import {attachActor, createActorThenable} from './actor.js';
import {
  type ActorLogicWithOutput,
  type ActorThenable,
  type AuditionOptions,
} from './types.js';
import {
  applyDefaults,
  createAbortablePromiseKit,
  DEFAULT_TIMEOUT,
  startTimer,
} from './util.js';

const untilDone = <
  Ref extends xs.ActorRefFrom<ActorLogicWithOutput>,
  Logic extends xs.ActorLogicFrom<Ref>,
  Output extends xs.OutputFrom<Ref>,
>(
  actorRef: Ref,
  options?: AuditionOptions,
): ActorThenable<Logic, Output> => {
  const {timeout = DEFAULT_TIMEOUT} = applyDefaults(options);
  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<Output>();
  if (timeout !== Infinity) {
    startTimer(
      abortController,
      timeout,
      `Actor did not complete in ${timeout}ms`,
    );
  }
  const actor = attachActor(actorRef, options);
  // order is important: create promise, then start.
  const p = xs.toPromise(actorRef);
  actor.start();
  p.then(resolve, reject);
  return createActorThenable(actorRef, promise);
};

export function runUntilDone(): <
  Ref extends xs.ActorRefFrom<ActorLogicWithOutput>,
  Logic extends xs.ActorLogicFrom<Ref>,
  Output extends xs.OutputFrom<Ref>,
>(
  actorRef: Ref,
) => ActorThenable<Logic, Output>;

export function runUntilDone<
  Ref extends xs.ActorRefFrom<ActorLogicWithOutput>,
  Logic extends xs.ActorLogicFrom<Ref>,
  Output extends xs.OutputFrom<Ref>,
>(actorRef: Ref): ActorThenable<Logic, Output>;

/**
 * Runs a completable actor to completion (or timeout) and fulfills with its
 * output (if any).
 *
 * @template Logic The actor logic
 * @template Output The actor output
 * @template Ref The actor reference
 * @param actorRef An existing {@link Actor}
 * @returns `Promise` fulfilling with the actor output
 */
export function runUntilDone<Ref extends xs.ActorRefFrom<ActorLogicWithOutput>>(
  actorRef?: Ref,
) {
  if (actorRef) {
    return untilDone(actorRef);
  }
  return (actorRef: Ref) => untilDone(actorRef);
}

export function runUntilDoneWith(): <
  Ref extends xs.ActorRefFrom<ActorLogicWithOutput>,
  Logic extends xs.ActorLogicFrom<Ref>,
  Output extends xs.OutputFrom<Ref>,
>(
  actorRef: Ref,
  options: AuditionOptions,
) => ActorThenable<Logic, Output>;

export function runUntilDoneWith<
  Ref extends xs.ActorRefFrom<ActorLogicWithOutput>,
  Logic extends xs.ActorLogicFrom<Ref>,
  Output extends xs.OutputFrom<Ref>,
>(actorRef: Ref): (options: AuditionOptions) => ActorThenable<Logic, Output>;

export function runUntilDoneWith<
  Ref extends xs.ActorRefFrom<ActorLogicWithOutput>,
  Logic extends xs.ActorLogicFrom<Ref>,
  Output extends xs.OutputFrom<Ref>,
>(actorRef: Ref, options: AuditionOptions): ActorThenable<Logic, Output>;

/**
 * Runs a completable actor to completion (or timeout) and fulfills with its
 * output (if any).
 *
 * @param actorRef An existing {@link ActorRef}
 * @param options Options
 * @returns `Promise` fulfilling with the actor output
 */
export function runUntilDoneWith<
  Ref extends xs.ActorRefFrom<ActorLogicWithOutput>,
>(actorRef?: Ref, options?: AuditionOptions) {
  if (actorRef) {
    if (options) {
      return untilDone(actorRef, options);
    }
    return (options: AuditionOptions) => untilDone(actorRef, options);
  }
  return (actorRef: Ref, options: AuditionOptions) =>
    untilDone(actorRef, options);
}
