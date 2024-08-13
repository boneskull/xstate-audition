import {strict as assert} from 'node:assert';
import {beforeEach, describe, it} from 'node:test';
import {type Actor, createActor, fromPromise} from 'xstate';

import {runUntilDone, runUntilDoneWith} from '../src/index.js';

const promiseLogic = fromPromise<string, string>(
  // this signal is aborted via call to Actor.stop()
  async ({input, signal}) => {
    let listener!: () => void;
    try {
      return await new Promise((resolve, reject) => {
        listener = () => {
          clearTimeout(timeout);
          // this rejection is eaten by xstate-audition
          // in lieu of its own timeout error (seen below)
          reject(signal.reason);
        };

        const timeout = setTimeout(() => {
          resolve(`hello ${input}`);
        }, 500);

        signal.addEventListener('abort', listener);
      });
    } finally {
      signal.removeEventListener('abort', listener);
    }
  },
);

describe('logic', () => {
  let actor: Actor<typeof promiseLogic>;

  beforeEach(() => {
    actor = createActor(promiseLogic, {input: 'world'});
  });

  it('should output with the expected value', async () => {
    const result = await runUntilDone(actor);

    assert.equal(result, 'hello world');
  });

  it('should abort when provided a too-short timeout', async () => {
    await assert.rejects(
      runUntilDoneWith(actor, {timeout: 100}),
      (err: Error) => {
        assert.equal(err.message, 'Actor did not complete in 100ms');

        return true;
      },
    );
  });
});
