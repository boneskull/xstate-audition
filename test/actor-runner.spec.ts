// /* eslint-disable n/no-unsupported-features/node-builtins */
// import assert from 'node:assert/strict';
// import {beforeEach, describe, it} from 'node:test';
// import {scheduler} from 'node:timers/promises';
// import {
//   type ActorLogic,
//   createActor,
//   createMachine,
//   type EventObject,
//   fromPromise,
//   type Snapshot,
//   spawnChild,
// } from 'xstate';

// const ACTOR_ID = 'test-actor';

// /**
//  * Dummy actor logic that does nothing.
//  */
// const dummyLogic: ActorLogic<Snapshot<undefined>, EventObject> = {
//   getInitialSnapshot: () => ({
//     context: undefined,
//     error: undefined,
//     output: undefined,
//     status: 'active',
//   }),
//   getPersistedSnapshot: (snapshot) => snapshot,
//   transition: (snapshot) => snapshot,
// };

// const promiseLogic = fromPromise<string, void>(async ({signal}) => {
//   if (signal.aborted) {
//     throw new Error('Aborted');
//   }
//   await scheduler.wait(100);
//   if (signal.aborted) {
//     throw new Error('Aborted');
//   }
//   return 'hello world';
// });

// /**
//  * A machine that waits, then spawns a {@link dummyLogic} actor, waits more, then
//  * exits.
//  */
// const spawnerMachine = createMachine({
//   initial: 'spawning',
//   states: {
//     done: {
//       type: 'final',
//     },
//     spawning: {
//       after: {
//         50: {
//           actions: spawnChild(dummyLogic, {id: ACTOR_ID}),
//           target: 'waitMore',
//         },
//       },
//     },
//     waitMore: {
//       after: {
//         50: 'done',
//       },
//     },
//   },
// });

// describe('ActorRunner', () => {
//   describe('method', () => {
//     describe('runUntilSpawn()', () => {
//       let runner: ActorRunner<typeof spawnerMachine>;

//       beforeEach(() => {
//         runner = new ActorRunner(spawnerMachine);
//       });

//       it('should return an ActorThenable', async () => {
//         const thenable = runner.runUntilSpawn(ACTOR_ID, {});

//         assert.ok(typeof thenable.then === 'function');
//         assert.ok(typeof thenable.catch === 'function');
//         assert.ok(typeof thenable.finally === 'function');
//       });

//       it('should stop the root actor immediately after the spawned actor is found', async () => {
//         // since `runUntilSpawn` does not resolve with the root actor, we need to
//         // create one now so we can check its status afterwards
//         const actor = createActor(spawnerMachine);
//         await runner.runUntilSpawn(ACTOR_ID, actor);

//         const {status} = actor.getSnapshot();
//         // note that this will be "done" if the machine entered its final state
//         // before the promise resolves, and "stopped" if the machine was stopped
//         // via runUntilSpawn()
//         assert.ok(status === 'stopped' || status === 'done');
//       });

//       it('should match the actor ID using a string', async () => {
//         const spawnedActor = await runner.runUntilSpawn(ACTOR_ID, {});
//         assert.equal(spawnedActor.id, ACTOR_ID);
//       });

//       it('should match the actor ID using a RegExp', async () => {
//         const regex = new RegExp(`${ACTOR_ID}`);
//         const spawnedActor = await runner.runUntilSpawn(regex, {});
//         assert.match(spawnedActor.id, regex);
//       });
//     });
//   });

// });
