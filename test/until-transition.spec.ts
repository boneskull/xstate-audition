import {expectTypeOf} from 'expect-type';
import {describe, it} from 'node:test';
import {type Actor, createActor} from 'xstate';

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

        const value = await promise;

        expectTypeOf<typeof value>().toEqualTypeOf<void>();
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

        const value = await promise;

        expectTypeOf<typeof value>().toEqualTypeOf<void>();
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

        const value = await promise;

        expectTypeOf<typeof value>().toEqualTypeOf<void>();
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

        const value = await promise;

        expectTypeOf<typeof value>().toEqualTypeOf<void>();
      });
    });
  });
});
