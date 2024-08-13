import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';
import {assign, createActor, setup} from 'xstate';

import {runUntilSnapshot} from '../src/index.js';

const snapshotLogic = setup({
  types: {
    context: {} as {word?: string},
  },
}).createMachine({
  initial: 'first',
  states: {
    done: {
      type: 'final',
    },
    first: {
      after: {
        50: 'second',
      },
      entry: assign({
        word: 'foo',
      }),
    },
    second: {
      after: {
        50: 'third',
      },
      entry: assign({
        word: 'bar',
      }),
    },
    third: {
      after: {
        50: 'done',
      },
      entry: assign({
        word: 'baz',
      }),
    },
  },
});

describe('snapshotLogic', () => {
  it('should contain word "bar" in state "second"', async () => {
    const actor = createActor(snapshotLogic);

    const snapshot = await runUntilSnapshot(actor, (snapshot) =>
      snapshot.matches('second'),
    );

    assert.deepEqual(snapshot.context, {word: 'bar'});
  });

  it('should be in state "second" when word is "bar"', async () => {
    const actor = createActor(snapshotLogic);

    const snapshot = await runUntilSnapshot(
      actor,
      (snapshot) => snapshot.context.word === 'bar',
    );

    assert.equal(snapshot.value, 'second');
  });
});
