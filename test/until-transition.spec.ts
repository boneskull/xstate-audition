import {expectTypeOf} from 'expect-type';
import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';
import {type Actor, createActor, createMachine} from 'xstate';

import {
  runUntilTransition,
  runUntilTransitionWith,
  waitForTransition,
  waitForTransitionWith,
} from '../src/index.js';
import {noop} from '../src/util.js';
import {receiverMachine} from './fixture.js';
import {testCurried} from './harness.js';

describe('xstate-audition', () => {
  describe('until-transition', () => {
    const transition = [
      'ReceiverMachine.initial',
      'ReceiverMachine.wait',
    ] as const;

    const resolver = (actor: Actor<typeof receiverMachine>) => {
      actor.send({type: 'PING'});
    };

    describe('runUntilTransition()', () => {
      testCurried(runUntilTransition, noop, receiverMachine, [...transition], {
        resolver,
        shouldStop: true,
      });

      it('should return a value with the expected type', async () => {
        const actor = createActor(receiverMachine);

        const promise = runUntilTransition(actor, ...transition);

        resolver(actor);

        const _value = await promise;

        expectTypeOf<typeof _value>().toEqualTypeOf<void>();
      });

      describe('when called with an Actor that immediately throws', () => {
        it('should reject with the thrown error', async () => {
          const err = new Error('yikes');

          const badActor = createActor(
            createMachine({
              id: 'Bad',
              initial: 'one',
              states: {
                one: {
                  entry: () => {
                    throw err;
                  },
                  target: 'two',
                },
                two: {
                  type: 'final',
                },
              },
            }),
          );

          const promise = runUntilTransition(badActor, 'Bad.one', 'Bad.two');

          await assert.rejects(promise, err);
        });
      });
    });

    describe('runUntilTransitionWith()', () => {
      testCurried(
        runUntilTransitionWith,
        noop,
        receiverMachine,
        [{}, ...transition],
        {
          resolver,
          shouldStop: true,
        },
      );

      it('should return a value with the expected type', async () => {
        const actor = createActor(receiverMachine);

        const promise = runUntilTransitionWith(actor, {}, ...transition);

        resolver(actor);

        const _value = await promise;

        expectTypeOf<typeof _value>().toEqualTypeOf<void>();
      });
    });

    describe('waitForTransition()', () => {
      testCurried(waitForTransition, noop, receiverMachine, [...transition], {
        resolver,
      });

      it('should return a value with the expected type', async () => {
        const actor = createActor(receiverMachine);

        const promise = waitForTransition(actor, ...transition);

        resolver(actor);

        const _value = await promise;

        expectTypeOf<typeof _value>().toEqualTypeOf<void>();
      });
    });

    describe('waitForTransitionWith()', () => {
      testCurried(
        waitForTransitionWith,
        noop,
        receiverMachine,
        [{}, ...transition],
        {resolver},
      );

      it('should return a value with the expected type', async () => {
        const actor = createActor(receiverMachine);

        const promise = waitForTransitionWith(actor, {}, ...transition);

        resolver(actor);

        const _value = await promise;

        expectTypeOf<typeof _value>().toEqualTypeOf<void>();
      });
    });
  });
});
