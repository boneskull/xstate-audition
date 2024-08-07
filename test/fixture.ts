import {
  type ActorLogic,
  createMachine,
  type EventObject,
  fromPromise,
  type Snapshot,
  spawnChild,
} from 'xstate';

import {wait} from '../src/util.js';

export const dummyLogic: ActorLogic<Snapshot<undefined>, EventObject> = {
  getInitialSnapshot: () => ({
    context: undefined,
    error: undefined,
    output: undefined,
    status: 'active',
  }),
  getPersistedSnapshot: (snapshot) => snapshot,
  transition: (snapshot) => snapshot,
};

export const promiseLogic = fromPromise<string, void>(async ({signal}) => {
  if (signal.aborted) {
    throw new Error('Aborted');
  }
  await wait(100);
  if (signal.aborted) {
    throw new Error('Aborted');
  }
  return 'hello world';
});

export const ACTOR_ID = 'test-actor';

/**
 * A machine that waits, then spawns a {@link dummyLogic} actor, waits more, then
 * exits.
 */
export const spawnerMachine = createMachine({
  initial: 'spawning',
  states: {
    done: {
      type: 'final',
    },
    spawning: {
      after: {
        50: {
          actions: spawnChild(dummyLogic, {id: ACTOR_ID}),
          target: 'waitMore',
        },
      },
    },
    waitMore: {
      after: {
        50: 'done',
      },
    },
  },
});
