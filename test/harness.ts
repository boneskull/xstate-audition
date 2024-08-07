import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';

import {type ActorThenable} from '../src/types.js';

/**
 * For our purposes, the final return type of a curried function may not itself
 * be a function.
 *
 * @see {@link testCurried}
 */
export type UncurriedReturnType<T> = T extends (...args: any[]) => any
  ? never
  : T;

/**
 * Tests a curried function by verifying its behavior when called with partial
 * arguments and when called with all arguments.
 *
 * When called with all arguments, the function may not return a function.
 *
 * @example
 *
 * ```ts
 * const curriedAdd = (a: number) => (b: number) => a + b;
 * testCurried(curriedAdd, (result) => assert.strictEqual(result, 3), 1, 2);
 * ```
 *
 * @template TArgs - The types of the arguments that the source function
 *   accepts.
 * @template TReturn - The type of the return value of the source function.
 * @param sourceFn - The curried function to be tested. It can be a function
 *   that returns a promise or a synchronous function.
 * @param assertionFn - A function that asserts the expected result of the
 *   source function when called with all arguments.
 * @param args - The arguments to be passed to the source function.
 * @throws Will throw an error if the number of provided arguments does not
 *   match the arity of the source function.
 * @throws Will throw an error if the source function does not have at least one
 *   argument.
 * @throws Will throw an error if no arguments are provided to curry.
 */
export function testCurried<
  TArgs extends any[],
  TReturn extends UncurriedReturnType<any>,
>(
  sourceFn:
    | ((...args: TArgs) => Promise<TReturn>)
    | ((...args: TArgs) => TReturn),
  assertionFn: (actual: TReturn) => void,
  ...args: TArgs
) {
  const arity = sourceFn.length;

  assert.ok(
    args.length === arity,
    'must provide exactly the number of arguments as the source function accepts',
  );
  assert.ok(arity > 0, 'source function must have at least one argument');
  assert.ok(args.length > 0, 'must provide at least one argument to curry');

  describe('when called', () => {
    for (let i = 0; i < arity - 1; i++) {
      it(`should return a function when called with ${i} argument(s)`, () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const actual = sourceFn(...(args.slice(0, i) as any));

        assert.ok(typeof actual === 'function');
      });
    }

    it('should return the expected result when called with all arguments', async () => {
      const actual = await sourceFn(...args);

      assertionFn(actual);
    });
  });
}

export function assertActorThenable(
  value: unknown,
): asserts value is ActorThenable<any> {
  assert.ok(value !== null, 'value is null');
  assert.ok(typeof value === 'object', 'value is not an object');
  assert.ok(
    typeof (value as Promise<any>).then === 'function',
    'value.then is not a function',
  );
  assert.ok(
    typeof (value as Promise<any>).catch === 'function',
    'value.catch is not a function',
  );
  assert.ok(
    typeof (value as Promise<any>).finally === 'function',
    'value.finally is not a function',
  );
  assert.ok(
    'id' in value && typeof value.id === 'string' && value.id,
    'value.id is not a nonempty string',
  );
  assert.ok(
    'sessionId' in value && typeof value.id === 'string' && value.sessionId,
    'value.sessionId is not a nonempty string',
  );
}
