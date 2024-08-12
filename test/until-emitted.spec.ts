import {expectTypeOf} from 'expect-type';
import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';
import {type Actor, createActor} from 'xstate';

import {
  type ActorEmittedTuple,
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

      it('should return a value with the expected type', async () => {
        const actor = createActor(emitterMachine);

        const value = await runUntilEmitted(actor, EMITTER_MACHINE_TYPES);

        expectTypeOf<typeof value>().toEqualTypeOf<
          [{type: 'EMIT'; value: string}]
        >();
        expectTypeOf<typeof value>().toEqualTypeOf<
          ActorEmittedTuple<
            Actor<typeof emitterMachine>,
            typeof EMITTER_MACHINE_TYPES
          >
        >();
      });
    });

    describe('waitForEmitted()', () => {
      testCurried(waitForEmitted, expectation, emitterMachine, [
        EMITTER_MACHINE_TYPES,
      ]);

      it('should return a value with the expected type', async () => {
        const actor = createActor(emitterMachine);

        const value = await waitForEmitted(actor, EMITTER_MACHINE_TYPES);

        expectTypeOf<typeof value>().toEqualTypeOf<
          [{type: 'EMIT'; value: string}]
        >();
        expectTypeOf<typeof value>().toEqualTypeOf<
          ActorEmittedTuple<
            Actor<typeof emitterMachine>,
            typeof EMITTER_MACHINE_TYPES
          >
        >();
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

      it('should return a value with the expected type', async () => {
        const actor = createActor(emitterMachine);

        const value = await runUntilEmittedWith(
          actor,
          {},
          EMITTER_MACHINE_TYPES,
        );

        expectTypeOf<typeof value>().toEqualTypeOf<
          [{type: 'EMIT'; value: string}]
        >();
        expectTypeOf<typeof value>().toEqualTypeOf<
          ActorEmittedTuple<
            Actor<typeof emitterMachine>,
            typeof EMITTER_MACHINE_TYPES
          >
        >();
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
          [{type: 'EMIT'; value: string}]
        >();
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
