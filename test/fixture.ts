import {
  type ActorLogic,
  createMachine,
  emit,
  type EventObject,
  fromPromise,
  log,
  sendTo,
  setup,
  type Snapshot,
  spawnChild,
} from 'xstate';

import {wait} from '../src/timer.js';

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
  await wait(100, signal);
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
      entry: [log(({self: {id}}) => `spawnerMachine [${id}] done`)],
      type: 'final',
    },
    spawning: {
      after: {
        50: {
          actions: [
            log(({self: {id}}) => `spawnerMachine [${id}] spawning`),
            spawnChild(dummyLogic, {id: ACTOR_ID}),
          ],
          target: 'waitMore',
        },
      },
      entry: [log(({self: {id}}) => `spawnerMachine [${id}] created`)],
    },
    waitMore: {
      after: {
        50: 'done',
      },
    },
  },
});

export const emitterMachine = setup({
  types: {
    emitted: {} as {type: 'EMIT'; value: string},
  },
}).createMachine({
  initial: 'emitting',
  states: {
    done: {
      entry: [log(({self: {id}}) => `emitterMachine [${id}] done`)],
      type: 'final',
    },
    emitting: {
      after: {
        50: {
          actions: [
            emit({type: 'EMIT', value: 'value'}),
            log(({self: {id}}) => `emitterMachine [${id}] emitted`),
          ],
          target: 'waitMore',
        },
      },
      entry: [log(({self: {id}}) => `emitterMachine [${id}] created`)],
    },
    waitMore: {
      after: {
        50: 'done',
      },
    },
  },
});

export type ReceiverMachineEvent = {type: 'PING'};

export const receiverMachine = setup({
  types: {
    events: {} as ReceiverMachineEvent,
  },
}).createMachine({
  id: 'ReceiverMachine',
  initial: 'initial',
  states: {
    done: {
      entry: [log(({self: {id}}) => `receiverMachine [${id}] done`)],
      type: 'final',
    },
    initial: {
      entry: [log(({self: {id}}) => `receiverMachine [${id}] created`)],
      on: {
        PING: {
          actions: [
            log(({self: {id}}) => `receiverMachine [${id}] received PING`),
          ],
          target: 'wait',
        },
      },
    },
    wait: {
      after: {
        50: 'done',
      },
    },
  },
});

export const senderMachine = setup({
  actors: {receiverMachine},
}).createMachine({
  id: 'SenderMachine',
  initial: 'spawning',
  states: {
    done: {
      entry: [log(({self: {id}}) => `senderMachine [${id}] done`)],
      type: 'final',
    },
    pinging: {
      after: {
        50: {
          actions: [
            log(({self: {id}}) => `senderMachine [${id}] sending PING`),
            sendTo('ReceiverMachine', {
              type: 'PING',
            }),
          ],
          target: 'waiting',
        },
      },
    },
    spawning: {
      after: {
        50: {
          actions: [
            spawnChild('receiverMachine', {
              id: 'ReceiverMachine',
            }),
          ],
          target: 'pinging',
        },
      },
      entry: [log(({self: {id}}) => `senderMachine [${id}] created`)],
    },
    waiting: {
      after: {
        50: 'done',
      },
    },
  },
});

export const EMITTER_MACHINE_TYPES = ['EMIT'] as const;
