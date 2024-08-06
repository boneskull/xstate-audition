import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  type ActorLogic,
  type AnyActorLogic,
  createActor,
  type EventObject,
  type Snapshot,
} from 'xstate';

import {attachActor, createActorThenable} from '../src/actor.js';
import {type ActorThenable, type AuditionOptions} from '../src/types.js';

describe('xstate-audition', () => {
  describe('actor', () => {
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
    describe('createActorThenable()', () => {
      /**
       * Dummy actor logic that does nothing.
       */

      it('should return an ActorThenable', () => {
        const actor = createActor(dummyLogic);
        const promise = Promise.resolve();
        const thenable = createActorThenable(actor, promise);

        assert.ok(typeof thenable.then === 'function');
        assert.ok(typeof thenable.catch === 'function');
        assert.ok(typeof thenable.finally === 'function');
      });

      it("should call the promise's then method", async () => {
        const actor = createActor(dummyLogic);
        const promise = Promise.resolve('test');
        const thenable = createActorThenable(actor, promise);

        const result = await thenable.then((value) => value);
        assert.equal(result, 'test');
      });

      it("should call the promise's catch method", async () => {
        const actor = createActor(dummyLogic);
        const promise = Promise.reject(new Error('test error'));
        const thenable = createActorThenable(actor, promise);

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
        const thenable = createActorThenable(actor, promise);

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
        const thenable = createActorThenable(actor, promise);
        const result = await thenable.then((value) => value);
        assert.equal(result, 'actor then');
      });
    });

    describe('attachActor()', () => {
      // TODO: needs spies; buried in Observable stuff
      it.todo('should set the custom inspector if provided');

      it('should set the custom logger if provided', () => {
        let actor = createActor(dummyLogic);
        const customLogger = () => {};
        const options: AuditionOptions = {logger: customLogger};

        actor = attachActor(actor, options);

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
        const options: AuditionOptions = {};

        actor = attachActor(actor, options);

        // @ts-expect-error private
        assert.equal(actor.logger, noop);
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        assert.equal(actor._actorScope.logger, noop);
      });
    });
  });
});
