import {expectTypeOf} from 'expect-type';
import {strict as assert} from 'node:assert';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {type Actor, type AnyActorRef} from 'xstate';

import {createActorWith} from '../src/create-actor.js';
import {
  runUntilSpawn,
  runUntilSpawnWith,
  waitForSpawn,
  waitForSpawnWith,
} from '../src/until-spawn.js';
import {ACTOR_ID, spawnerMachine} from './fixture.js';
import {testCurried} from './harness.js';

describe('xstate-audition', () => {
  describe('until-spawn', () => {
    const createActor = createActorWith<typeof spawnerMachine>({
      logger: () => {},
    });

    describe('runUntilSpawn()', () => {
      testCurried<AnyActorRef>(
        runUntilSpawn,
        (actual) => {
          assert.strictEqual(actual.id, ACTOR_ID);
        },
        spawnerMachine,
        [ACTOR_ID],
        {shouldStop: true},
      );

      describe('actor matching', () => {
        let actor: Actor<typeof spawnerMachine>;

        beforeEach(() => {
          actor = createActor(spawnerMachine);
        });

        afterEach(() => {
          actor?.stop();
        });

        it('should match the actor ID using a string', async () => {
          actor = createActor(spawnerMachine);

          const {id} = await runUntilSpawn(actor, ACTOR_ID);

          assert.equal(id, ACTOR_ID);
        });

        it('should match the actor ID using a RegExp', async () => {
          const regex = new RegExp(`${ACTOR_ID}`);

          actor = createActor(spawnerMachine);

          const {id} = await runUntilSpawn(actor, regex);

          assert.match(id, regex);
        });

        it('should return a value with the expected type', async () => {
          actor = createActor(spawnerMachine);

          const _value = await runUntilSpawn(actor, ACTOR_ID);

          expectTypeOf<typeof _value>().toEqualTypeOf<AnyActorRef>();
        });
      });
    });

    describe('waitForSpawn()', () => {
      testCurried<AnyActorRef>(
        waitForSpawn,
        (actual) => {
          assert.strictEqual(actual.id, ACTOR_ID);
        },
        spawnerMachine,
        [ACTOR_ID],
      );

      describe('actor matching', () => {
        let actor: Actor<typeof spawnerMachine>;

        beforeEach(() => {
          actor = createActor(spawnerMachine);
        });

        afterEach(() => {
          actor?.stop();
        });

        it('should match the actor ID using a string', async () => {
          actor = createActor(spawnerMachine);

          const {id} = await waitForSpawn(actor, ACTOR_ID);

          assert.equal(id, ACTOR_ID);
        });

        it('should match the actor ID using a RegExp', async () => {
          const regex = new RegExp(`${ACTOR_ID}`);

          actor = createActor(spawnerMachine);

          const {id} = await waitForSpawn(actor, regex);

          assert.match(id, regex);
        });

        it('should return a value with the expected type', async () => {
          actor = createActor(spawnerMachine);

          const _value = await waitForSpawn(actor, ACTOR_ID);

          expectTypeOf<typeof _value>().toEqualTypeOf<AnyActorRef>();
        });
      });
    });

    describe('runUntilSpawnWith()', () => {
      testCurried<AnyActorRef>(
        runUntilSpawnWith,
        (actual) => {
          assert.strictEqual(actual.id, ACTOR_ID);
        },
        spawnerMachine,
        [{}, ACTOR_ID],
        {shouldStop: true},
      );

      describe('actor matching', () => {
        let actor: Actor<typeof spawnerMachine>;

        beforeEach(() => {
          actor = createActor(spawnerMachine);
        });

        afterEach(() => {
          actor?.stop();
        });

        it('should match the actor ID using a string', async () => {
          actor = createActor(spawnerMachine);

          const {id} = await runUntilSpawnWith(actor, {}, ACTOR_ID);

          assert.equal(id, ACTOR_ID);
        });

        it('should match the actor ID using a RegExp', async () => {
          const regex = new RegExp(`${ACTOR_ID}`);

          actor = createActor(spawnerMachine);

          const {id} = await runUntilSpawnWith(actor, {}, regex);

          assert.match(id, regex);
        });

        it('should return a value with the expected type', async () => {
          actor = createActor(spawnerMachine);

          const _value = await runUntilSpawnWith(actor, {}, ACTOR_ID);

          expectTypeOf<typeof _value>().toEqualTypeOf<AnyActorRef>();
        });

        it('should timeout if the actor does not complete in time', async () => {
          const timeout = 10; // Set a short timeout for testing

          actor = createActor(spawnerMachine);
          await assert.rejects(
            runUntilSpawnWith(actor, {timeout}, ACTOR_ID),
            (err) => {
              assert.match(
                (err as Error).message,
                new RegExp(
                  `Failed to detect a spawned actor matching ${ACTOR_ID} in ${timeout}ms`,
                ),
              );

              return true;
            },
          );
        });
      });
    });

    describe('waitForSpawnWith()', () => {
      testCurried<AnyActorRef>(
        waitForSpawnWith,
        (actual) => {
          assert.strictEqual(actual.id, ACTOR_ID);
        },
        spawnerMachine,
        [{}, ACTOR_ID],
      );

      describe('actor matching', () => {
        let actor: Actor<typeof spawnerMachine>;

        beforeEach(() => {
          actor = createActor(spawnerMachine);
        });

        afterEach(() => {
          actor?.stop();
        });

        it('should match the actor ID using a string', async () => {
          actor = createActor(spawnerMachine);

          const {id} = await waitForSpawnWith(actor, {}, ACTOR_ID);

          assert.equal(id, ACTOR_ID);
        });

        it('should match the actor ID using a RegExp', async () => {
          const regex = new RegExp(`${ACTOR_ID}`);

          actor = createActor(spawnerMachine);

          const {id} = await waitForSpawnWith(actor, {}, regex);

          assert.match(id, regex);
        });

        it('should return a value with the expected type', async () => {
          actor = createActor(spawnerMachine);

          const _value = await waitForSpawnWith(actor, {}, ACTOR_ID);

          expectTypeOf<typeof _value>().toEqualTypeOf<AnyActorRef>();
        });

        it('should timeout if the actor does not complete in time', async () => {
          const timeout = 10; // Set a short timeout for testing

          actor = createActor(spawnerMachine);
          await assert.rejects(
            waitForSpawnWith(actor, {timeout}, ACTOR_ID),
            (err) => {
              assert.match(
                (err as Error).message,
                new RegExp(
                  `Failed to detect a spawned actor matching ${ACTOR_ID} in ${timeout}ms`,
                ),
              );

              return true;
            },
          );
        });
      });
    });
  });
});
