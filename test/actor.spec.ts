import {strict as assert} from 'node:assert';
import {afterEach, beforeEach, describe, it, mock} from 'node:test';
import {type Actor, createActor, createMachine, spawnChild} from 'xstate';

import {patchActor} from '../src/actor.js';
import {type AuditionOptions} from '../src/types.js';
import {waitForSpawn} from '../src/until-spawn.js';
import {noop} from '../src/util.js';
import {dummyLogic} from './fixture.js';

describe('xstate-audition', () => {
  describe('actor', () => {
    describe('patchActor()', () => {
      describe('when no inspector provided', () => {
        it('should add a default (no-op) inspector to the actor', () => {
          const actor = createActor(dummyLogic);

          const systemInspect = mock.method(actor.system, 'inspect');

          patchActor(actor);

          assert.equal(systemInspect.mock.callCount(), 1);
          assert.equal(systemInspect.mock.calls[0]?.arguments[0], noop);
        });
      });

      describe('when a custom inspector is provided', () => {
        it('should add a custom inspector to the actor', () => {
          const actor = createActor(dummyLogic);

          const systemInspect = mock.method(actor.system, 'inspect');

          const inspector = mock.fn();

          patchActor(actor, {inspector});

          assert.equal(systemInspect.mock.callCount(), 1);
          assert.equal(systemInspect.mock.calls[0]?.arguments[0], inspector);
        });
      });

      describe('when the actor is not a root actor', () => {
        /**
         * This machine immediately spawns a child actor when started.
         *
         * We can "catch" it using {@link waitForSpawn}.
         */
        const DummySpawnerMachine = createMachine({
          entry: spawnChild(dummyLogic, {id: 'child'}),
        });

        const originalLogger = mock.fn();

        let actor: Actor<typeof DummySpawnerMachine>;

        beforeEach(() => {
          actor = createActor(DummySpawnerMachine, {logger: originalLogger});
        });

        afterEach(() => {
          actor.stop();
        });

        it('should combine original and provided logger into the actor logger', async () => {
          const newLogger = mock.fn();

          // maybe if we assigned the ref to the context in the machine, we
          // could fish the child ref out of a snapshot instead of calling this?
          // what's better? I don't know.
          const childActor = await waitForSpawn(actor, 'child');

          const options: AuditionOptions = {logger: newLogger};

          patchActor(childActor, options);

          actor.system._logger('test');

          // @ts-expect-error private
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          childActor.logger('test');

          assert.equal(originalLogger.mock.callCount(), 2);
          assert.equal(newLogger.mock.callCount(), 1);
        });
      });

      describe('when the actor is a root actor', () => {
        it('should combine original and provided logger into the system logger', () => {
          const originalLogger = mock.fn();

          const newLogger = mock.fn();

          const actor = createActor(dummyLogic, {logger: originalLogger});

          const options: AuditionOptions = {logger: newLogger};

          patchActor(actor, options);

          actor.system._logger('test');

          assert.equal(originalLogger.mock.callCount(), 1);
          assert.equal(newLogger.mock.callCount(), 1);
        });
      });
    });
  });
});
