import {strict as assert} from 'node:assert';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {isPromise} from 'node:util/types';
import {type Actor, type AnyActorLogic, type Snapshot} from 'xstate';

import {createActorWith} from '../src/create-actor.js';
import {type AnyActor, type AuditionOptions} from '../src/types.js';
import {noop} from '../src/util.js';

export interface TestAuditionOptions<Actor extends AnyActor = AnyActor>
  extends Omit<AuditionOptions, 'timeout'> {
  resolver?: (actor: Actor) => void;
  shouldStop?: boolean;
}

/**
 * Tests a curried function by verifying its behavior when called with partial
 * arguments and when called with all arguments.
 *
 * When called with all arguments, the function _must not_ return a function.
 *
 * @template TArgs - The types of the arguments that the source function
 *   accepts.
 * @template TReturn - The type of the return value of the source function.
 * @param sourceFn - The curried function to be tested. It can be a function
 *   that returns a promise or a synchronous function.
 * @param expectationFn - A function that asserts the expected result of the
 *   source function when called with all arguments.
 * @param args - The arguments to be passed to the source function.
 * @param resolver - A function which will trigger the final `Promise` to
 *   resolve, if needed
 * @param options - Additional options to configure the test.
 * @throws Will throw an error if the number of provided arguments does not
 *   match the arity of the source function.
 * @throws Will throw an error if the source function does not have at least one
 *   argument.
 * @throws Will throw an error if no arguments are provided to curry.
 */
export function testCurried<
  TReturn,
  Logic extends AnyActorLogic = AnyActorLogic,
>(
  sourceFn: (actor: Actor<Logic>, ...args: any[]) => any,
  expectationFn: (actual: TReturn) => void,
  logic: Logic,
  args?: unknown[],
  {
    inspector: inspect = noop,
    logger = noop,
    resolver = noop,
    shouldStop = false,
  }: TestAuditionOptions = {},
) {
  const arity = sourceFn.length;

  args ??= [];

  assert.ok(
    args.length + 1 === arity,
    'must provide exactly the number of arguments as the source function accepts',
  );
  assert.ok(arity > 0, 'source function must have at least one argument');
  assert.ok(logic, 'must provide logic to create actor');

  const createActor = createActorWith<Logic>({inspect, logger});

  describe('common behavior', () => {
    let actor: Actor<Logic>;

    beforeEach(() => {
      actor = createActor(logic);
    });

    afterEach(() => {
      actor.stop();
    });

    for (let i = 0; i < arity - 1; i++) {
      it(`should return a function when called with ${i} argument(s)`, () => {
        const actual = sourceFn(
          actor,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          ...(args.slice(0, i) as any),
        ) as unknown as (...args: any[]) => any;

        assert.ok(
          typeof actual === 'function',
          'expected a function when provided less than all arguments',
        );
      });
    }

    describe(`when called with ${arity} argument(s)`, () => {
      it(`should fulfill with the expected result`, async () => {
        const promise = sourceFn(actor, ...args) as Promise<TReturn>;

        resolver(actor);

        expectationFn(await promise);
      });

      it('should return a Promise', async () => {
        const promise = sourceFn(actor, ...args) as Promise<TReturn>;

        assert.ok(
          isPromise(promise),
          'expected a Promise to be returned from source function',
        );
        resolver(actor);
        await promise;
      });

      describe('when the Promise is settled', () => {
        let snapshot: Snapshot<unknown>;

        beforeEach(async () => {
          const promise = sourceFn(actor, ...args) as Promise<TReturn>;

          resolver(actor);
          await promise;

          snapshot = actor.getSnapshot();
        });

        if (shouldStop) {
          it('should stop the actor when the Promise is settled', () => {
            assert.equal(snapshot.status, 'stopped');
          });
        } else {
          it('should not stop the actor when the Promise is settled', () => {
            assert.notEqual(snapshot.status, 'stopped');
          });
        }
      });
    });
  });
}
