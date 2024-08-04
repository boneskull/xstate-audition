/* eslint-disable n/no-unsupported-features/node-builtins */
import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';
import {scheduler} from 'node:timers/promises';
import {
  type ActorLogic,
  type AnyActorLogic,
  createActor,
  createMachine,
  type EventObject,
  fromPromise,
  type Snapshot,
  spawnChild,
} from 'xstate';

import {ActorRunner} from '../src/actor-runner.js';
import {
  type ActorRunnerOptionsForActor,
  type ActorThenable,
} from '../src/types.js';
import {DEFAULT_TIMEOUT} from '../src/util.js';

const ACTOR_ID = 'test-actor';

/**
 * Dummy actor logic that does nothing.
 */
const dummyLogic: ActorLogic<Snapshot<undefined>, EventObject> = {
  getInitialSnapshot: () => ({
    context: undefined,
    error: undefined,
    output: undefined,
    status: 'active',
  }),
  getPersistedSnapshot: (snapshot) => snapshot,
  transition: (snapshot) => snapshot,
};

const promiseLogic = fromPromise<string, void>(async ({signal}) => {
  if (signal.aborted) {
    throw new Error('Aborted');
  }
  await scheduler.wait(100);
  if (signal.aborted) {
    throw new Error('Aborted');
  }
  return 'hello world';
});

/**
 * A machine that waits, then spawns a {@link dummyLogic} actor, waits more, then
 * exits.
 */
const spawnerMachine = createMachine({
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

describe('ActorRunner', () => {
  describe('constructor', () => {
    let runner: ActorRunner<typeof dummyLogic>;

    describe('when instantiated without options', () => {
      beforeEach(() => {
        runner = new ActorRunner(dummyLogic);
      });

      it('should set default timeout', () => {
        assert.ok(
          runner.defaultTimeout === Infinity ||
            runner.defaultTimeout === DEFAULT_TIMEOUT,
        );
      });

      it('should set default logger', () => {
        assert.ok(typeof runner.defaultLogger === 'function');
      });

      it('should set default inspector', () => {
        assert.ok(typeof runner.defaultInspector === 'function');
      });

      it('should set default actor logic', () => {
        assert.equal(runner.defaultActorLogic, dummyLogic);
      });
    });

    describe('when instantiated with options', () => {
      it('should set custom timeout', () => {
        runner = new ActorRunner(dummyLogic, {timeout: 100});
        assert.equal(runner.defaultTimeout, 100);
      });

      it('should set custom logger', () => {
        const logger = () => {};
        runner = new ActorRunner(dummyLogic, {logger});
        assert.equal(runner.defaultLogger, logger);
      });

      it('should set custom inspector', () => {
        const inspector = () => {};
        runner = new ActorRunner(dummyLogic, {inspector});
        assert.equal(runner.defaultInspector, inspector);
      });

      it('should set custom actor ID', () => {
        runner = new ActorRunner(dummyLogic, {id: 'test'});
        assert.equal(runner.defaultId, 'test');
      });
    });
  });

  describe('static method', () => {
    describe('createAbortablePromiseKit()', () => {
      it('should return an AbortablePromiseKit', () => {
        const kit = ActorRunner.createAbortablePromiseKit<void>();
        assert.ok(kit.abortController instanceof AbortController);
        assert.ok(kit.promise instanceof Promise);
        assert.ok(typeof kit.reject === 'function');
        assert.ok(typeof kit.resolve === 'function');
      });

      it('should resolve the promise when resolve is called', async () => {
        const kit = ActorRunner.createAbortablePromiseKit<string>();
        kit.resolve('test');
        const result = await kit.promise;
        assert.equal(result, 'test');
      });

      it('should reject the promise when reject is called', async () => {
        const kit = ActorRunner.createAbortablePromiseKit();
        const error = new Error('test error');
        kit.reject(error);
        await assert.rejects(kit.promise, error);
      });

      it('should reject the promise if the signal is already aborted', async () => {
        const abortController = new AbortController();
        const err = new Error('already aborted');
        abortController.abort(err);
        const kit = ActorRunner.createAbortablePromiseKit(abortController);
        await assert.rejects(kit.promise, err);
      });

      it('should reject the promise when the signal is aborted', async () => {
        const kit = ActorRunner.createAbortablePromiseKit();
        const error = new Error('aborted');
        kit.abortController.abort(error);
        await assert.rejects(kit.promise, error);
      });

      it('should abort the signal after the promise is fulfilled', async () => {
        const kit = ActorRunner.createAbortablePromiseKit<void>();
        const signal = kit.abortController.signal;
        kit.resolve();
        await kit.promise;
        assert.ok(signal.aborted);
      });

      it('should abort the signal after the promise is rejected', async () => {
        const kit = ActorRunner.createAbortablePromiseKit();
        const signal = kit.abortController.signal;
        kit.reject();
        await kit.promise.catch(() => {});
        assert.ok(signal.aborted);
      });
    });

    describe('createActorThenable()', () => {
      it('should return an ActorThenable', () => {
        const actor = createActor(dummyLogic);
        const promise = Promise.resolve();
        const thenable = ActorRunner.createActorThenable(actor, promise);

        assert.ok(typeof thenable.then === 'function');
        assert.ok(typeof thenable.catch === 'function');
        assert.ok(typeof thenable.finally === 'function');
      });

      it("should call the promise's then method", async () => {
        const actor = createActor(dummyLogic);
        const promise = Promise.resolve('test');
        const thenable = ActorRunner.createActorThenable(actor, promise);

        const result = await thenable.then((value) => value);
        assert.equal(result, 'test');
      });

      it("should call the promise's catch method", async () => {
        const actor = createActor(dummyLogic);
        const promise = Promise.reject(new Error('test error'));
        const thenable = ActorRunner.createActorThenable(actor, promise);

        await assert.rejects(
          thenable.catch((err) => {
            throw err;
          }),
          {
            message: 'test error',
          },
        );
      });

      it("should call the promise's finally method", async () => {
        const actor = createActor(dummyLogic);
        let finallyCalled = false;
        const promise = Promise.resolve();
        const thenable = ActorRunner.createActorThenable(actor, promise);

        await thenable.finally(() => {
          finallyCalled = true;
        });

        assert.ok(finallyCalled);
      });

      it("should retain the actor's then method if it is already an ActorThenable", async () => {
        const actor = Object.assign(createActor(dummyLogic), {
          catch: (onRejected: (arg: unknown) => unknown) =>
            Promise.reject('actor catch').catch(onRejected),
          finally: (onFinally: () => void) =>
            Promise.resolve().finally(onFinally),
          then: (onFulfilled: (arg: string) => string) =>
            Promise.resolve('actor then').then(onFulfilled),
        }) as unknown as ActorThenable<AnyActorLogic, string>;

        const promise = Promise.resolve('promise then');
        const thenable = ActorRunner.createActorThenable(actor, promise);
        const result = await thenable.then((value) => value);
        assert.equal(result, 'actor then');
      });
    });
  });

  describe('method', () => {
    describe('startTimer()', () => {
      let runner: ActorRunner<typeof dummyLogic>;

      describe('when timeout is Infinity returns true', () => {
        beforeEach(() => {
          runner = new ActorRunner(dummyLogic);
        });

        // TODO: this would be better with a spy
        it('should not start a timer', async () => {
          const ac = new AbortController();
          const timeout = Infinity;
          runner.startTimer(ac, timeout);
          await scheduler.wait(100);
          assert.ok(!ac.signal.aborted);
        });
      });

      describe('when isDebugMode returns false', () => {
        beforeEach(() => {
          runner = new ActorRunner(dummyLogic, {
            isDebugMode: () => false,
          });
        });

        it('should start a timer and abort after the timeout', async () => {
          const ac = new AbortController();
          const timeout = 10;
          const message = 'Timeout exceeded';

          runner.startTimer(ac, timeout, message);
          await scheduler.wait(timeout + 50);

          assert.ok(ac.signal.aborted);
          assert.equal((ac.signal.reason as Error).message, message);
        });

        it('should use default timeout message if none is provided', async () => {
          const ac = new AbortController();
          const timeout = 10;

          runner.startTimer(ac, timeout);

          await scheduler.wait(timeout + 50);

          assert.ok(ac.signal.aborted);
          assert.equal(
            (ac.signal.reason as Error).message,
            `Timeout of ${timeout}ms exceeded`,
          );
        });

        it('should not abort if the timeout is not reached', async () => {
          const ac = new AbortController();
          const timeout = 10;

          runner.startTimer(ac, timeout);

          await scheduler.wait(0);

          try {
            assert.ok(!ac.signal.aborted);
          } finally {
            ac.abort();
          }
        });
      });
    });

    describe('getActorId()', () => {
      let runner: ActorRunner<typeof dummyLogic>;

      beforeEach(() => {
        runner = new ActorRunner(dummyLogic);
      });

      it('should return the default ID if no input is provided', () => {
        const defaultId = 'default-id';
        runner.defaultId = defaultId;
        const id = runner.getActorId({});
        assert.equal(id, defaultId);
      });

      it('should return the actor ID if input is an actor with an ID', () => {
        const actor = createActor(dummyLogic, {id: 'actor-id'});
        const id = runner.getActorId(actor);
        assert.equal(id, 'actor-id');
      });

      it('should generate a unique ID if no ID is provided', () => {
        const id = runner.getActorId({});
        assert.match(id, /^__ActorHelpers-\d+__$/);
      });

      it('should increment the anonymous actor index for each generated ID', () => {
        const id1 = runner.getActorId({});
        const id2 = runner.getActorId({});
        assert.notEqual(id1, id2);
        assert.match(id1, /^__ActorHelpers-\d+__$/);
        assert.match(id2, /^__ActorHelpers-\d+__$/);
      });
    });

    describe('instrumentActor()', () => {
      let runner: ActorRunner<typeof dummyLogic>;

      beforeEach(() => {
        runner = new ActorRunner(dummyLogic);
      });

      // TODO: needs spies; buried in Observable stuff
      it.todo('should set the custom inspector if provided');

      it('should set the custom logger if provided', () => {
        const actor = createActor(dummyLogic);
        const customLogger = () => {};
        const options: ActorRunnerOptionsForActor = {logger: customLogger};

        runner.instrumentActor(actor, options);

        // @ts-expect-error private
        assert.equal(actor.logger, customLogger);
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        assert.equal(actor._actorScope.logger, customLogger);
      });

      // TODO: needs spies; buried in Observable stuff
      it.todo('should use the default inspector if none is provided');

      it('should use the default logger if none is provided', () => {
        const logger = () => {};
        let actor = createActor(dummyLogic, {logger});
        const options: ActorRunnerOptionsForActor = {};

        actor = runner.instrumentActor(actor, options);

        // @ts-expect-error private
        assert.equal(actor.logger, runner.defaultLogger);
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        assert.equal(actor._actorScope.logger, runner.defaultLogger);
      });
    });

    describe('runUntilSpawn()', () => {
      let runner: ActorRunner<typeof spawnerMachine>;

      beforeEach(() => {
        runner = new ActorRunner(spawnerMachine);
      });

      it('should return an ActorThenable', async () => {
        const thenable = runner.runUntilSpawn(ACTOR_ID, {});

        assert.ok(typeof thenable.then === 'function');
        assert.ok(typeof thenable.catch === 'function');
        assert.ok(typeof thenable.finally === 'function');
      });

      it('should stop the root actor immediately after the spawned actor is found', async () => {
        // since `runUntilSpawn` does not resolve with the root actor, we need to
        // create one now so we can check its status afterwards
        const actor = createActor(spawnerMachine);
        await runner.runUntilSpawn(ACTOR_ID, actor);

        const {status} = actor.getSnapshot();
        // note that this will be "done" if the machine entered its final state
        // before the promise resolves, and "stopped" if the machine was stopped
        // via runUntilSpawn()
        assert.ok(status === 'stopped' || status === 'done');
      });

      it('should match the actor ID using a string', async () => {
        const spawnedActor = await runner.runUntilSpawn(ACTOR_ID, {});
        assert.equal(spawnedActor.id, ACTOR_ID);
      });

      it('should match the actor ID using a RegExp', async () => {
        const regex = new RegExp(`${ACTOR_ID}`);
        const spawnedActor = await runner.runUntilSpawn(regex, {});
        assert.match(spawnedActor.id, regex);
      });
    });
  });

  describe('runUntilDone', () => {
    let runner: ActorRunner<typeof promiseLogic>;

    beforeEach(() => {
      runner = new ActorRunner(promiseLogic);
    });

    it('should return an ActorThenable', async () => {
      const thenable = runner.runUntilDone();

      assert.ok(typeof thenable.then === 'function');
      assert.ok(typeof thenable.catch === 'function');
      assert.ok(typeof thenable.finally === 'function');
    });

    it('should fulfill with the actor output', async () => {
      const thenable = runner.runUntilDone();

      const output = await thenable;
      assert.strictEqual(output, 'hello world'); // Assuming dummyLogic's output is undefined
    });

    it('should timeout if the actor does not complete in time', async () => {
      const timeout = 10; // Set a short timeout for testing
      const actor = createActor(promiseLogic);
      const thenable = runner.runUntilDone(actor, {timeout});

      try {
        await thenable;
        assert.fail('Expected to timeout');
      } catch (error) {
        assert.match(
          (error as Error).message,
          /Actor did not complete in \d+ms/,
        );
      }
    });

    it('should abort the actor when the promise is settled', async () => {
      const actor = createActor(promiseLogic);
      await runner.runUntilDone(actor);
      const {status} = actor.getSnapshot();
      assert.ok(status === 'done' || status === 'stopped');
    });
  });
});
