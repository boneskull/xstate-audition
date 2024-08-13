import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';
import {createActor, fromPromise, setup, spawnChild} from 'xstate';

import {waitForSpawn} from '../src/index.js';

const noopPromiseLogic = fromPromise<void, void>(async () => {});

const spawnerMachine = setup({
  actors: {noop: noopPromiseLogic},
  types: {events: {} as {type: 'SPAWN'}},
}).createMachine({
  on: {
    SPAWN: {
      actions: spawnChild('noop', {id: 'noopPromise'}),
    },
  },
});

describe('spawnerMachine', () => {
  it('should spawn a child with ID "noopPromise" when "SPAWN" event received', async () => {
    const actor = createActor(spawnerMachine);

    try {
      // spawnerMachine needs an event to spawn the actor. but at this point,
      // the actor hasn't started, so we cannot send the event because nothing
      // will be listening for it.
      //
      // but if we start the actor ourselves & send the event, spawning could
      // happen before waitForSpawn can detect it! so instead of immediately
      // awaiting, let's just set it up first.
      const promise = waitForSpawn<typeof noopPromiseLogic>(
        actor,
        'noopPromise',
      );

      // the detection is now setup and the actor is active; the code running in
      // the Promise is waiting for the spawn to occur. so let's oblige it:
      actor.send({type: 'SPAWN'});

      // ...then we can finally await the promise.
      const actorRef = await promise;

      assert.equal(actorRef.id, 'noopPromise');
    } finally {
      // you can shutdown manually! for fun!
      actor.stop();
    }
  });
});
