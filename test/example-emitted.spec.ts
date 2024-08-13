import {strict as assert} from 'node:assert';
import {beforeEach, describe, it} from 'node:test';
import {type Actor, createActor, emit, setup} from 'xstate';

import {type CurryEmittedP1, runUntilEmitted} from '../src/index.js';

type Emit1 = {type: 'EMIT1'; value: string};

type Emit2 = {type: 'EMIT2'; value: number};

type EmitterEmitted = Emit1 | Emit2;

const emitterMachine = setup({
  types: {
    emitted: {} as EmitterEmitted,
  },
}).createMachine({
  entry: [
    emit({type: 'EMIT1', value: 'value'}),
    emit({type: 'EMIT2', value: 42}),
  ],
});

describe('emitterMachine', () => {
  let actor: Actor<typeof emitterMachine>;

  let runUntilEmit: CurryEmittedP1<typeof actor>;

  beforeEach(() => {
    actor = createActor(emitterMachine);

    // runUntilEmitted is curried, so could be called with [actor, ['EMIT1', 'EMIT2']]
    // instead
    runUntilEmit = runUntilEmitted(actor);
  });

  it('should emit two events', async () => {
    const [emit1Event, emit2Event] = await runUntilEmit(['EMIT1', 'EMIT2']);

    assert.deepEqual(emit1Event, {type: 'EMIT1', value: 'value'});
    assert.deepEqual(emit2Event, {type: 'EMIT2', value: 42});
  });
});
