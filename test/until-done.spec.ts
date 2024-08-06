import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';
import {type ActorRefFrom, createActor, fromPromise} from 'xstate';

import {runUntilDone, runUntilDoneWith} from '../src/until-done.js';
import {wait} from '../src/util.js';

describe('xstate-audition', () => {
  describe('until-done', () => {
    const promiseLogic = fromPromise<string, void>(async ({signal}) => {
      if (signal.aborted) {
        throw new Error('Aborted');
      }
      await wait(100);
      if (signal.aborted) {
        throw new Error('Aborted');
      }
      return 'hello world';
    });

    describe('runUntilDone()', () => {
      let actor: ActorRefFrom<typeof promiseLogic>;

      beforeEach(() => {
        actor = createActor(promiseLogic);
      });

      describe('when not provided an actor', () => {
        it('should return a function that accepts an actor', async () => {
          const run = runUntilDone();
          assert.ok(typeof run === 'function');

          const output = await run(actor);
          assert.equal(output, 'hello world');
        });
      });

      describe('when provided an actor', () => {
        it('should return an ActorThenable', async () => {
          const thenable = runUntilDone(actor);

          assert.ok(typeof thenable.then === 'function');
          assert.ok(typeof thenable.catch === 'function');
          assert.ok(typeof thenable.finally === 'function');
        });

        it('should fulfill with the actor output', async () => {
          const output = await runUntilDone(actor);

          assert.equal(output, 'hello world');
        });

        it('should timeout if the actor does not complete in time', async () => {
          const timeout = 10; // Set a short timeout for testing
          const actor = createActor(promiseLogic);
          await assert.rejects(runUntilDoneWith(actor, {timeout}), (err) => {
            assert.match(
              (err as Error).message,
              /Actor did not complete in \d+ms/,
            );
            return true;
          });
        });

        it('should abort the actor when the promise is settled', async () => {
          const actor = createActor(promiseLogic);
          await runUntilDone(actor);
          const {status} = actor.getSnapshot();
          assert.ok(status === 'done' || status === 'stopped');
        });
      });
    });
  });
});
