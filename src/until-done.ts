import * as xs from 'xstate';

import {attachActor, createActorThenable} from './actor.js';
import {applyDefaults} from './defaults.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {
  type ActorThenable,
  type AuditionOptions,
  type OutputtableLogic,
} from './types.js';
import {DEFAULT_TIMEOUT, startTimer} from './util.js';

export type CurryDone =
  | (() => CurryDone)
  | (<
      Logic extends OutputtableLogic,
      Actor extends xs.Actor<Logic>,
      Output extends xs.OutputFrom<Actor>,
    >(
      actor: Actor,
    ) => CurryDoneP1<Logic, Actor, Output>);

export type CurryDoneP1<
  Logic extends OutputtableLogic,
  Actor extends xs.Actor<Logic>,
  Output extends xs.OutputFrom<Actor>,
> = ActorThenable<Logic, Output>;

export type CurryDoneWith =
  | (() => CurryDoneWith)
  | (<
      Logic extends OutputtableLogic,
      Actor extends xs.Actor<Logic>,
      Output extends xs.OutputFrom<Actor>,
    >(
      actor: Actor,
      options: AuditionOptions,
    ) => CurryDoneWithP2<Logic, Actor, Output>)
  | (<
      Logic extends OutputtableLogic,
      Actor extends xs.Actor<Logic>,
      Output extends xs.OutputFrom<Actor>,
    >(
      actor: Actor,
    ) => CurryDoneWithP1<Logic, Actor, Output>);

export type CurryDoneWithP1<
  Logic extends OutputtableLogic,
  Actor extends xs.Actor<Logic>,
  Output extends xs.OutputFrom<Actor>,
> =
  | (() => CurryDoneWithP1<Logic, Actor, Output>)
  | ((options: AuditionOptions) => CurryDoneWithP2<Logic, Actor, Output>);

export type CurryDoneWithP2<
  Logic extends OutputtableLogic,
  Actor extends xs.Actor<Logic>,
  Output extends xs.OutputFrom<Actor>,
> = ActorThenable<Logic, Output>;

type DoneFn = <
  Logic extends OutputtableLogic,
  Actor extends xs.Actor<Logic>,
  Output extends xs.OutputFrom<Actor>,
>(
  actor: Actor,
  options: AuditionOptions,
) => ActorThenable<Logic, Output>;

export function runUntilDone(): CurryDone;

export function runUntilDone<
  Logic extends OutputtableLogic,
  Actor extends xs.Actor<Logic>,
  Output extends xs.OutputFrom<Actor>,
>(actor: Actor): CurryDoneP1<Logic, Actor, Output>;

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
export function runUntilDone<
  Logic extends OutputtableLogic,
  Actor extends xs.Actor<Logic>,
>(actor?: Actor) {
  return runUntilDone_(actor);
}

export function runUntilDoneWith(): CurryDoneWith;

export function runUntilDoneWith<
  Logic extends OutputtableLogic,
  Actor extends xs.Actor<Logic>,
  Output extends xs.OutputFrom<Actor>,
>(actor: Actor): CurryDoneWithP1<Logic, Actor, Output>;

export function runUntilDoneWith<
  Logic extends OutputtableLogic,
  Actor extends xs.Actor<Logic>,
  Output extends xs.OutputFrom<Actor>,
>(
  actor: Actor,
  options: AuditionOptions,
): CurryDoneWithP2<Logic, Actor, Output>;

export function runUntilDoneWith<
  Logic extends OutputtableLogic,
  Actor extends xs.Actor<Logic>,
  Output extends xs.OutputFrom<Actor>,
>(actor?: Actor, options?: AuditionOptions) {
  return runUntilDoneWith_<Logic, Actor, Output>(actor, options);
}

const createDoneFn = <T extends DoneFn>(doneFn: T, stop = false) => {
  const curryDone = <
    Logic extends OutputtableLogic,
    Actor extends xs.Actor<Logic>,
    Output extends xs.OutputFrom<Actor>,
  >(
    actor?: Actor,
  ) => {
    if (actor) {
      return doneFn(actor, {stop}) as CurryDoneP1<Logic, Actor, Output>;
    }
    return curryDone as CurryDone;
  };

  return curryDone;
};

const createDoneWithFn = <T extends DoneFn>(doneFn: T) => {
  const curryDoneWith = <
    Logic extends OutputtableLogic,
    Actor extends xs.Actor<Logic>,
    Output extends xs.OutputFrom<Actor>,
  >(
    actor?: Actor,
    options?: AuditionOptions,
  ) => {
    if (actor) {
      if (options) {
        return doneFn(actor, {...options, stop: true}) as CurryDoneWithP2<
          Logic,
          Actor,
          Output
        >;
      }
      return ((options?: AuditionOptions) =>
        options
          ? curryDoneWith(actor, options)
          : curryDoneWith(actor)) as CurryDoneWithP1<Logic, Actor, Output>;
    }
    return curryDoneWith as CurryDoneWith;
  };

  return curryDoneWith;
};

const untilDone = <
  Logic extends OutputtableLogic,
  Actor extends xs.Actor<Logic>,
  Output extends xs.OutputFrom<Actor>,
>(
  actor: Actor,
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

  actor = attachActor(actor, options);

  // order is important: create promise, then start.
  const p = xs.toPromise(actor);

  actor.start();
  p.then(resolve, reject);
  return createActorThenable(actor, promise);
};

const runUntilDone_ = createDoneFn(untilDone, true);

const runUntilDoneWith_ = createDoneWithFn(untilDone);
