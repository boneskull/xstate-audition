import {strict as assert} from 'node:assert';
import {beforeEach, describe, it} from 'node:test';
import {type Actor, createActor} from 'xstate';

import {runUntilSpawn} from '../src/until-spawn.js';
import {ACTOR_ID, spawnerMachine} from './fixture.js';
import {assertActorThenable, testCurried} from './harness.js';

describe('xstate-audition', () => {
  describe('until-spawn', () => {
    describe('runUntilSpawn()', () => {
      let actor: Actor<typeof spawnerMachine>;

      beforeEach(() => {
        actor = createActor(spawnerMachine);
      });

      testCurried(
        runUntilSpawn,
        (actual) => {
          assert.strictEqual(actual.id, ACTOR_ID);
        },
        createActor(spawnerMachine),
        ACTOR_ID,
      );

      it('should return an ActorThenable', async () => {
        const thenable = runUntilSpawn(actor, ACTOR_ID);

        assertActorThenable(thenable);
      });

      it('should stop the root actor immediately after the spawned actor is found', async () => {
        // since `runUntilSpawn` does not resolve with the root actor, we need to
        // create one now so we can check its status afterwards
        const actor = createActor(spawnerMachine);

        await runUntilSpawn(actor, ACTOR_ID);

        const {status} = actor.getSnapshot();

        // note that this will be "done" if the machine entered its final state
        // before the promise resolves, and "stopped" if the machine was stopped
        // via runUntilSpawn()
        assert.ok(status === 'stopped' || status === 'done');
      });

      it('should match the actor ID using a string', async () => {
        const spawnedActor = await runUntilSpawn(actor, ACTOR_ID);

        assert.equal(spawnedActor.id, ACTOR_ID);
      });

      it('should match the actor ID using a RegExp', async () => {
        const regex = new RegExp(`${ACTOR_ID}`);

        const spawnedActor = await runUntilSpawn(actor, regex);

        assert.match(spawnedActor.id, regex);
      });
    });
  });
});
