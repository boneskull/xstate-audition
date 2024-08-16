import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';
import {createActor, createMachine} from 'xstate';

import {runUntilDone, runUntilDoneWith} from '../src/until-done.js';
import {promiseLogic} from './fixture.js';
import {testCurried} from './harness.js';

describe('xstate-audition', () => {
  describe('until-done', () => {
    describe('runUntilDone()', () => {
      testCurried(
        runUntilDone,
        (actual: string) => {
          assert.equal(actual, 'hello world');
        },
        promiseLogic,
        // do not pass shouldStop; it only checks for status "stopped".
        // the status will be "done"
      );

      it('should stop the actor when the Promise is settled', async () => {
        const actor = createActor(promiseLogic);

        await runUntilDone(actor);

        const {status} = actor.getSnapshot();

        assert.equal(status, 'done');
      });

      describe('when called with an Actor that immediately throws', () => {
        it('should reject with the thrown error', async () => {
          const badActor = createActor(
            createMachine({
              entry: () => {
                throw new Error('yikes!');
              },
            }),
          );

          const promise = runUntilDone(badActor);

          await assert.rejects(promise, {message: 'yikes!'});
        });
      });
    });

    describe('runUntilDoneWith()', () => {
      testCurried(
        runUntilDoneWith,
        (actual: string) => {
          assert.equal(actual, 'hello world');
        },
        promiseLogic,
        [{}],
        // do not pass shouldStop; it only checks for status "stopped".
        // the status will be "done"
      );

      it('should stop the actor when the Promise is settled', async () => {
        const actor = createActor(promiseLogic);

        await runUntilDoneWith(actor, {});

        const {status} = actor.getSnapshot();

        assert.equal(status, 'done');
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
    });
  });
});
