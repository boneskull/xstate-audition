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
            const _value = await runUntilEmitted(actor, EMITTER_MACHINE_TYPES);

            expectTypeOf<typeof _value>().toEqualTypeOf<
              ActorEmittedTuple<
                Actor<typeof emitterMachine>,
                typeof EMITTER_MACHINE_TYPES
              >
            >();
          });
        });

        describe('when called without arguments', () => {
          it('should return itself', async () => {
            const _value = runUntilEmitted();

            expectTypeOf<typeof _value>().toEqualTypeOf<CurryEmitted>();
          });
        });

        describe('when called with one argument', () => {
          it('should return a curried function type', async () => {
            const _value = runUntilEmitted(actor);

            expectTypeOf<typeof _value>().toEqualTypeOf<
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
            const _value = await waitForEmitted(actor, EMITTER_MACHINE_TYPES);

            expectTypeOf<typeof _value>().toEqualTypeOf<
              ActorEmittedTuple<
                Actor<typeof emitterMachine>,
                typeof EMITTER_MACHINE_TYPES
              >
            >();
          });
        });

        describe('when called without arguments', () => {
          it('should return itself', () => {
            const _value = waitForEmitted();

            expectTypeOf<typeof _value>().toEqualTypeOf<CurryEmitted>();
          });
        });

        describe('when called with one argument', () => {
          it('should return a curried function type', () => {
            const _value = waitForEmitted(actor);

            expectTypeOf<typeof _value>().toEqualTypeOf<
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
            const _value = await runUntilEmittedWith(
              actor,
              {},
              EMITTER_MACHINE_TYPES,
            );

            expectTypeOf<typeof _value>().toEqualTypeOf<
              ActorEmittedTuple<
                Actor<typeof emitterMachine>,
                typeof EMITTER_MACHINE_TYPES
              >
            >();
          });
        });

        describe('when called without arguments', () => {
          it('should return itself', async () => {
            const _value = runUntilEmittedWith();

            expectTypeOf<typeof _value>().toEqualTypeOf<CurryEmittedWith>();
          });
        });

        describe('when called with one argument', () => {
          it('should return a curried function type', async () => {
            const _value = runUntilEmittedWith(actor);

            expectTypeOf<typeof _value>().toEqualTypeOf<
              CurryEmittedWithP1<typeof actor>
            >();
          });
        });

        describe('when called with two arguments', () => {
          it('should return a curried function type', async () => {
            const _value = runUntilEmittedWith(actor, {});

            expectTypeOf<typeof _value>().toEqualTypeOf<
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

        const _value = await waitForEmittedWith(
          actor,
          {},
          EMITTER_MACHINE_TYPES,
        );

        expectTypeOf<typeof _value>().toEqualTypeOf<
          ActorEmittedTuple<
            Actor<typeof emitterMachine>,
            typeof EMITTER_MACHINE_TYPES
          >
        >();
      });
    });
  });
});
