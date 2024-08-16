import {type AnyActorRef, type Subscription} from 'xstate';

import {type AuditionOptions, type LoggerFn} from './types.js';
import {noop} from './util.js';

/**
 * Data stored for each `ActorRef` that has been patched.
 *
 * @internal
 */
type PatchData = {inspectorSubscription: Subscription; logger: LoggerFn};

/**
 * A `WeakMap` to store the data for each `ActorRef` that has been patched. Used
 * by {@link unpatchActor}.
 *
 * @internal
 */
const patchData = new WeakMap<AnyActorRef, PatchData[]>();

/**
 * Utility to _mutate_ an existing {@link ActorRef} allowing addition of an
 * inspector and/or new logger.
 *
 * Inspectors are additive, so adding a new inspector is not destructive.
 * Inspectors are applied across the _entire_ system; there is no way to inspect
 * only one actor.
 *
 * The logger needs to be replaced with a new function that calls the original
 * logger and the new logger. If the `ActorRef` is a _root_ actor (the one
 * created via `createActor()`), the logger will be set at the system level;
 * otherwise it will only be set for the particular Actor.
 *
 * **Warning**: If you use this function and plan using {@link unpatchActor},
 * modifying the `ActorRef`'s logger via external means will result in the loss
 * of those modifications.
 *
 * @remarks
 * This function is called internally (with its own instrumentation, as
 * appropriate) by **xstate-audition** on the root `Actor`, and _for every
 * spawned Actor_. That said, it may be useful otherwise to have granular
 * control (e.g., when paired with `waitForSpawn()`).
 * @example
 *
 * ```js
 * const actor = createActor(someLogic);
 * let childActor = await waitForSpawn(actor, 'childId');
 * childActor = patchActor(childActor, {
 *   logger: console.log,
 *   inspector: console.dir,
 * });
 * ```
 *
 * @template Actor The type of `ActorRef` to patch
 * @param actor An `ActorRef` (or `Actor`)
 * @param options Options
 * @returns The original `actor`, but modified
 * @see {@link https://stately.ai/docs/inspection}
 */
export function patchActor<Actor extends AnyActorRef>(
  actor: Actor,
  {inspector: inspect = noop, logger = noop}: AuditionOptions = {},
): Actor {
  const subscription = actor.system.inspect(inspect);

  const data: PatchData[] = patchData.get(actor) ?? [];

  // if there's a reason to prefer a Proxy here, I don't know what it is.

  if (actor._parent) {
    // @ts-expect-error private
    const oldLogger = actor.logger as LoggerFn;

    data.push({inspectorSubscription: subscription, logger: oldLogger});

    // in this case, ref.logger should be the same as ref._actorScope.logger
    // https://github.com/statelyai/xstate/blob/12bde7a3ff47be6bb5a54b03282a77baf76c2bd6/packages/core/src/createActor.ts#L167

    // @ts-expect-error private
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    actor.logger = actor._actorScope.logger = (...args: any[]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      oldLogger(...args);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      logger(...args);
    };
  } else {
    const oldLogger = actor.system._logger;

    data.push({inspectorSubscription: subscription, logger: oldLogger});
    // @ts-expect-error private
    actor.logger =
      actor.system._logger =
      // @ts-expect-error private
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      actor._actorScope.logger =
        (...args: any[]) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          oldLogger(...args);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          logger(...args);
        };
  }
  patchData.set(actor, data);

  return actor;
}

/**
 * Reverts what was done in {@link patchActor} for a given `ActorRef`. This will
 * revert _all_ changes to a given `ActorRef` made by `patchActor` _in reverse
 * order_.
 *
 * Mutates `actor`.
 *
 * If `actor` has not been patched via `patchActor`, this function returns the
 * identity.
 *
 * **Warning**: If changes were made to the `ActorRef`'s logger by means _other
 * than_ `patchActor` after the first call to `patchActor` (internally or
 * otherwise), assume they will be lost.
 *
 * @remarks
 * This function is not currently used internally and is considered
 * **experimental**. It may be removed in the future if it does not prove to
 * have a reasonable use-case.
 * @template Actor The type of the `ActorRef` to unpatch
 * @param actor `ActorRef` or `Actor` to unpatch
 * @returns `actor`, but unpatched
 * @experimental
 */
export function unpatchActor<Actor extends AnyActorRef>(actor: Actor): Actor {
  const data = patchData.get(actor);

  if (!data) {
    return actor;
  }

  for (const {inspectorSubscription, logger} of data.reverse()) {
    inspectorSubscription.unsubscribe();
    // @ts-expect-error private
    actor.logger = actor._parent
      ? // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (actor._actorScope.logger = logger)
      : // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (actor._actorScope.logger = actor.system._logger = logger);
  }

  patchData.delete(actor);

  return actor;
}
