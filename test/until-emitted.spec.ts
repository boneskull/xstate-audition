import {expectTypeOf} from 'expect-type';
import {strict as assert} from 'node:assert';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {type Actor, createActor} from 'xstate';

import {
  type ActorEmittedTuple,
  type CurryEmitted,
  type CurryEmittedP1,
  type CurryEmittedWith,
  type CurryEmittedWithP1,
  type CurryEmittedWithP2,
  runUntilEmitted,
  runUntilEmittedWith,
  waitForEmitted,
  waitForEmittedWith,
} from '../src/until-emitted.js';
import {EMITTER_MACHINE_TYPES, emitterMachine} from './fixture.js';
import {testCurried} from './harness.js';

describe('xstate-audition', () => {
  describe('until-emitted', () => {
    const expectation = (
      actual: ActorEmittedTuple<
        Actor<typeof emitterMachine>,
        typeof EMITTER_MACHINE_TYPES
      >,
    ) => {
      assert.deepEqual(actual, [{type: 'EMIT', value: 'value'}]);
    };

    describe('runUntilEmitted()', () => {
      testCurried(
        runUntilEmitted,
        expectation,
        emitterMachine,
        [EMITTER_MACHINE_TYPES],
        {
          shouldStop: true,
        },
      );

      describe('type', () => {
        let actor: Actor<typeof emitterMachine>;

        beforeEach(() => {
          actor = createActor(emitterMachine);
        });

        afterEach(() => {
          actor.stop();
        });

        it('should satisfy the expected type', () => {
          runUntilEmitted satisfies CurryEmitted;
        });

        describe('when called with all arguments', () => {
          it('should return a value with the expected type', async () => {
            const value = await runUntilEmitted(actor, EMITTER_MACHINE_TYPES);

            expectTypeOf<typeof value>().toEqualTypeOf<
              ActorEmittedTuple<
                Actor<typeof emitterMachine>,
                typeof EMITTER_MACHINE_TYPES
              >
            >();
          });
        });

        describe('when called without arguments', () => {
          it('should return itself', async () => {
            const func = runUntilEmitted();

            expectTypeOf<typeof func>().toEqualTypeOf<CurryEmitted>();
          });
        });

        describe('when called with one argument', () => {
          it('should return a curried function type', async () => {
            const func = runUntilEmitted(actor);

            expectTypeOf<typeof func>().toEqualTypeOf<
              CurryEmittedP1<typeof actor>
            >();
          });
        });
      });
    });

    describe('waitForEmitted()', () => {
      testCurried(waitForEmitted, expectation, emitterMachine, [
        EMITTER_MACHINE_TYPES,
      ]);

      describe('type', () => {
        let actor: Actor<typeof emitterMachine>;

        beforeEach(() => {
          actor = createActor(emitterMachine);
        });

        afterEach(() => {
          actor.stop();
        });

        it('should satisfy the expected type', () => {
          waitForEmitted satisfies CurryEmitted;
        });

        describe('when called with all arguments', () => {
          it('should return a value with the expected type', async () => {
            const value = await waitForEmitted(actor, EMITTER_MACHINE_TYPES);

            expectTypeOf<typeof value>().toEqualTypeOf<
              ActorEmittedTuple<
                Actor<typeof emitterMachine>,
                typeof EMITTER_MACHINE_TYPES
              >
            >();
          });
        });

        describe('when called without arguments', () => {
          it('should return itself', () => {
            const func = waitForEmitted();

            expectTypeOf<typeof func>().toEqualTypeOf<CurryEmitted>();
          });
        });

        describe('when called with one argument', () => {
          it('should return a curried function type', () => {
            const func = waitForEmitted(actor);

            expectTypeOf<typeof func>().toEqualTypeOf<
              CurryEmittedP1<typeof actor>
            >();
          });
        });
      });
    });

    describe('runUntilEmittedWith()', () => {
      testCurried<
        ActorEmittedTuple<
          Actor<typeof emitterMachine>,
          typeof EMITTER_MACHINE_TYPES
        >,
        typeof emitterMachine
      >(
        runUntilEmittedWith,
        expectation,
        emitterMachine,
        [{}, EMITTER_MACHINE_TYPES],
        {shouldStop: true},
      );

      describe('type', () => {
        let actor: Actor<typeof emitterMachine>;

        beforeEach(() => {
          actor = createActor(emitterMachine);
        });

        afterEach(() => {
          actor.stop();
        });

        it('should satisfy the expected type', () => {
          runUntilEmittedWith satisfies CurryEmittedWith;
        });

        describe('when called with all arguments', () => {
          it('should return a value with the expected type', async () => {
            const value = await runUntilEmittedWith(
              actor,
              {},
              EMITTER_MACHINE_TYPES,
            );

            expectTypeOf<typeof value>().toEqualTypeOf<
              ActorEmittedTuple<
                Actor<typeof emitterMachine>,
                typeof EMITTER_MACHINE_TYPES
              >
            >();
          });
        });

        describe('when called without arguments', () => {
          it('should return itself', async () => {
            const func = runUntilEmittedWith();

            expectTypeOf<typeof func>().toEqualTypeOf<CurryEmittedWith>();
          });
        });

        describe('when called with one argument', () => {
          it('should return a curried function type', async () => {
            const func = runUntilEmittedWith(actor);

            expectTypeOf<typeof func>().toEqualTypeOf<
              CurryEmittedWithP1<typeof actor>
            >();
          });
        });

        describe('when called with two arguments', () => {
          it('should return a curried function type', async () => {
            const func = runUntilEmittedWith(actor, {});

            expectTypeOf<typeof func>().toEqualTypeOf<
              CurryEmittedWithP2<typeof actor>
            >();
          });
        });
      });
    });

    describe('waitForEmittedWith()', () => {
      testCurried(waitForEmittedWith, expectation, emitterMachine, [
        {},
        EMITTER_MACHINE_TYPES,
      ]);

      it('should return a value with the expected type', async () => {
        const actor = createActor(emitterMachine);

        const value = await waitForEmittedWith(
          actor,
          {},
          EMITTER_MACHINE_TYPES,
        );

        expectTypeOf<typeof value>().toEqualTypeOf<
          ActorEmittedTuple<
            Actor<typeof emitterMachine>,
            typeof EMITTER_MACHINE_TYPES
          >
        >();
      });
    });
  });
});
