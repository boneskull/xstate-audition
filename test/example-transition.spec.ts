import {strict as assert} from 'node:assert';
import {beforeEach, describe, it} from 'node:test';
import {type Actor, createActor, createMachine} from 'xstate';

import {type CurryTransitionP2, runUntilTransition} from '../src/index.js';

const transitionMachine = createMachine({
  // if you do not supply a default ID, then the ID will be `(machine)`
  id: 'transitionMachine',
  initial: 'first',
  states: {
    first: {
      after: {
        100: 'second',
      },
    },
    second: {
      after: {
        100: 'third',
      },
    },
    third: {
      type: 'final',
    },
  },
});

describe('transitionMachine', () => {
  let actor: Actor<typeof transitionMachine>;

  let runWithFirst: CurryTransitionP2<typeof actor>;

  beforeEach(() => {
    actor = createActor(transitionMachine);
    // curried
    runWithFirst = runUntilTransition(actor, 'transitionMachine.first');
  });

  it('should transition from "first" to "second"', async () => {
    await runWithFirst('transitionMachine.second');
  });

  it('should not transition from "first" to "third"', async () => {
    await assert.rejects(runWithFirst('transitionMachine.third'));
  });
});
