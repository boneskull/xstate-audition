import {strict as assert} from 'node:assert';
import {beforeEach, describe, it} from 'node:test';
import {type Actor, createActor} from 'xstate';

import {runUntilDone, runUntilDoneWith} from '../src/until-done.js';
import {promiseLogic} from './fixture.js';
import {testCurried} from './harness.js';

describe('xstate-audition', () => {
  describe('until-done', () => {
    describe('runUntilDone()', () => {
      let actor: Actor<typeof promiseLogic>;

      beforeEach(() => {
        actor = createActor(promiseLogic);
      });

      testCurried(
        runUntilDone,
        (actual: string) => {
          assert.equal(actual, 'hello world');
        },
        createActor(promiseLogic),
      );

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

        it('should abort the actor when the promise is settled', async () => {
          const actor = createActor(promiseLogic);

          await runUntilDone(actor);

          const {status} = actor.getSnapshot();

          assert.ok(status === 'done' || status === 'stopped');
        });
      });
    });

    describe('runUntilDoneWith()', () => {
      let actor: Actor<typeof promiseLogic>;

      beforeEach(() => {
        actor = createActor(promiseLogic);
      });

      testCurried(
        runUntilDoneWith,
        (actual: string) => {
          assert.equal(actual, 'hello world');
        },
        createActor(promiseLogic),
        {},
      );

      describe('when provided an actor and options', () => {
        it('should return an ActorThenable', async () => {
          const thenable = runUntilDoneWith(actor, {});

          assert.ok(typeof thenable.then === 'function');
          assert.ok(typeof thenable.catch === 'function');
          assert.ok(typeof thenable.finally === 'function');
        });

        it('should fulfill with the actor output', async () => {
          const output = await runUntilDoneWith(actor, {});

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

          await runUntilDoneWith(actor, {});

          const {status} = actor.getSnapshot();

          assert.ok(status === 'done' || status === 'stopped');
        });
      });
    });
  });
});
