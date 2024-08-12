import {type AnyActorRef} from 'xstate';

import {type AuditionOptions} from './types.js';
import {noop} from './util.js';

/**
 * Sets up an existing `ActorRef` with a logger and inspector.
 *
 * @param ref `Actor` or `ActorRef`
 * @param options Options for instrumentation
 * @returns Instrumented actor
 * @internal
 */
export function attachActor(
  ref: AnyActorRef,
  {inspector: inspect = noop, logger = noop}: AuditionOptions = {},
): void {
  ref.system.inspect(inspect);

  // @ts-expect-error private
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  ref.logger = ref._actorScope.logger = logger;
}
