import * as xs from 'xstate';

import {attachActor} from './actor.js';
import {applyDefaults} from './defaults.js';
import {createAbortablePromiseKit} from './promise-kit.js';
import {startTimer} from './timer.js';
import {
  type AnyOutputtableActor,
  type AuditionOptions,
  type InternalAuditionOptions,
} from './types.js';

export type CurryDone =
  | (() => CurryDone)
  | (<Actor extends AnyOutputtableActor, Output extends xs.OutputFrom<Actor>>(
      actor: Actor,
    ) => CurryDoneP1<Actor, Output>);

export type CurryDoneP1<
  Actor extends AnyOutputtableActor,
  Output extends xs.OutputFrom<Actor>,
> = Promise<Output>;

export type CurryDoneWith =
  | (() => CurryDoneWith)
  | (<Actor extends AnyOutputtableActor, Output extends xs.OutputFrom<Actor>>(
      actor: Actor,
      options: AuditionOptions,
    ) => CurryDoneWithP2<Actor, Output>)
  | (<Actor extends AnyOutputtableActor, Output extends xs.OutputFrom<Actor>>(
      actor: Actor,
    ) => CurryDoneWithP1<Actor, Output>);

export type CurryDoneWithP1<
  Actor extends AnyOutputtableActor,
  Output extends xs.OutputFrom<Actor>,
> =
  | (() => CurryDoneWithP1<Actor, Output>)
  | ((options: AuditionOptions) => CurryDoneWithP2<Actor, Output>);

export type CurryDoneWithP2<
  Actor extends AnyOutputtableActor,
  Output extends xs.OutputFrom<Actor>,
> = Promise<Output>;

export function runUntilDone(): CurryDone;

export function runUntilDone<
  Actor extends AnyOutputtableActor,
  Output extends xs.OutputFrom<Actor>,
>(actor: Actor): CurryDoneP1<Actor, Output>;

/**
 * Runs a completable actor to completion (or timeout) and fulfills with its
 * output (if any).
 *
 * @template Actor['logic'] The actor Actor['logic']
 * @template Output The actor output
 * @template Ref The actor reference
 * @param actorRef An existing {@link Actor}
 * @returns `Promise` fulfilling with the actor output
 */
export function runUntilDone<Actor extends AnyOutputtableActor>(actor?: Actor) {
  return runUntilDone_(actor);
}

export function runUntilDoneWith(): CurryDoneWith;

export function runUntilDoneWith<
  Actor extends AnyOutputtableActor,
  Output extends xs.OutputFrom<Actor>,
>(actor: Actor): CurryDoneWithP1<Actor, Output>;

export function runUntilDoneWith<
  Actor extends AnyOutputtableActor,
  Output extends xs.OutputFrom<Actor>,
>(actor: Actor, options: AuditionOptions): CurryDoneWithP2<Actor, Output>;

export function runUntilDoneWith<
  Actor extends AnyOutputtableActor,
  Output extends xs.OutputFrom<Actor>,
>(actor?: Actor, options?: AuditionOptions) {
  return runUntilDoneWith_<Actor, Output>(actor, options);
}

const createDoneFn = () => {
  const curryDone = <
    Actor extends AnyOutputtableActor,
    Output extends xs.OutputFrom<Actor>,
  >(
    actor?: Actor,
  ) => {
    if (actor) {
      return untilDone(actor, {stop: false}) as CurryDoneP1<Actor, Output>;
    }

    return curryDone as CurryDone;
  };

  return curryDone;
};

const createDoneWithFn = () => {
  const curryDoneWith = <
    Actor extends AnyOutputtableActor,
    Output extends xs.OutputFrom<Actor>,
  >(
    actor?: Actor,
    options?: AuditionOptions,
  ) => {
    if (actor) {
      if (options) {
        return untilDone(actor, {...options, stop: true}) as CurryDoneWithP2<
          Actor,
          Output
        >;
      }

      return ((options?: AuditionOptions) =>
        options
          ? curryDoneWith(actor, options)
          : curryDoneWith(actor)) as CurryDoneWithP1<Actor, Output>;
    }

    return curryDoneWith as CurryDoneWith;
  };

  return curryDoneWith;
};

const untilDone = <
  Actor extends AnyOutputtableActor,
  Output extends xs.OutputFrom<Actor>,
>(
  actor: Actor,
  options?: InternalAuditionOptions,
): Promise<Output> => {
  const opts = applyDefaults(options);

  const {inspector, logger, timeout} = opts;

  const {abortController, promise, reject, resolve} =
    createAbortablePromiseKit<Output>();

  startTimer(
    actor,
    abortController,
    timeout,
    `Actor did not complete in ${timeout}ms`,
  );

  const inspectorObserver = xs.toObserver(inspector);

  const seenActors: WeakSet<xs.AnyActorRef> = new WeakSet();

  const doneInspector: xs.Observer<xs.InspectionEvent> = {
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

  attachActor(actor, {...opts, inspector: doneInspector});
  seenActors.add(actor);

  // order is important: create promise, then start.
  void xs.toPromise(actor).then(resolve, (err) => {
    actor.stop();

    return reject(err);
  });

  actor.start();

  return promise;
};

const runUntilDone_ = createDoneFn();

const runUntilDoneWith_ = createDoneWithFn();