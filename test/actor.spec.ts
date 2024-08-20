import {strict as assert} from 'node:assert';
import {afterEach, beforeEach, describe, it, type Mock, mock} from 'node:test';
import {
  type Actor,
  createActor,
  createMachine,
  type InspectionEvent,
  spawnChild,
} from 'xstate';

import {patchActor, unpatchActor} from '../src/actor.js';
import {type AuditionOptions, type LoggerFn} from '../src/types.js';
import {waitForSpawn} from '../src/until-spawn.js';
import {dummyLogic} from './fixture.js';

describe('xstate-audition', () => {
  describe('actor', () => {
    describe('patchActor()', () => {
      describe('when no inspector provided', () => {
        it('should not add an inspector to the actor', () => {
          const actor = createActor(dummyLogic);

          const systemInspect = mock.method(actor.system, 'inspect');

          patchActor(actor);

          assert.equal(
            systemInspect.mock.callCount(),
            0,
            'actor.system.inspect() was called',
          );
        });
      });

      describe('when a custom inspector is provided', () => {
        it('should add a custom inspector to the actor', () => {
          const actor = createActor(dummyLogic);

          const systemInspect = mock.method(actor.system, 'inspect');

          const inspector = mock.fn();

          patchActor(actor, {inspector});

          assert.equal(
            systemInspect.mock.callCount(),
            1,
            'actor.system.inspect() was not called once',
          );
          assert.equal(
            systemInspect.mock.calls[0]?.arguments[0],
            inspector,
            'actor.system.inspect() was not called with the custom inspector',
          );
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

        it('should overwrite the original logger but not the system logger', async () => {
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

          assert.equal(
            originalLogger.mock.callCount(),
            1,
            'original logger was not called once after patching',
          );
          assert.equal(
            newLogger.mock.callCount(),
            1,
            'new logger was not called once after patching',
          );
        });
      });

      describe('when the actor is a root actor', () => {
        it('should overwrite the original logger and system logger', () => {
          const originalLogger = mock.fn();

          const newLogger = mock.fn();

          const actor = createActor(dummyLogic, {logger: originalLogger});

          const options: AuditionOptions = {logger: newLogger};

          patchActor(actor, options);

          // @ts-expect-error private
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          actor.logger('test');
          actor.system._logger('test');

          assert.equal(
            originalLogger.mock.callCount(),
            0,
            'original logger was called after patching',
          );
          assert.equal(
            newLogger.mock.callCount(),
            2,
            'new logger was not called twice after patching',
          );
        });
      });
    });

    describe('unpatchActor()', () => {
      let actor: Actor<typeof dummyLogic>;

      let originalLogger: Mock<(evt: InspectionEvent) => void>;

      let newLogger: Mock<LoggerFn>;

      let inspector: Mock<(evt: InspectionEvent) => void>;

      beforeEach(() => {
        actor = createActor(dummyLogic);

        originalLogger =
          // @ts-expect-error private
          actor.logger =
          // @ts-expect-error private
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          actor._actorScope.logger =
          actor.system._logger =
            mock.fn();

        newLogger = mock.fn<LoggerFn>();
        inspector = mock.fn<(evt: InspectionEvent) => void>();

        patchActor(actor, {inspector, logger: newLogger});
      });

      describe('when patched once', () => {
        it('should restore the original logger', () => {
          // @ts-expect-error private
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          actor.logger('test');
          assert.equal(
            originalLogger.mock.callCount(),
            0,
            'original logger was called',
          );
          assert.equal(
            newLogger.mock.callCount(),
            1,
            'new logger was not called once',
          );

          unpatchActor(actor);

          // @ts-expect-error private
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          actor.logger('test');

          assert.equal(
            originalLogger.mock.callCount(),
            1,
            'original logger was not called once',
          );
        });

        it('should unsubscribe the inspector', () => {
          actor.start();
          actor.stop();
          assert.equal(inspector.mock.callCount(), 3);

          unpatchActor(actor);
          actor.start();

          try {
            assert.equal(inspector.mock.callCount(), 3);
          } finally {
            actor.stop();
          }
        });
      });

      describe('when patched multiple times', () => {
        it('should restore the previous logger', () => {
          const evenNewerLogger = mock.fn<LoggerFn>();

          patchActor(actor, {logger: evenNewerLogger});
          // @ts-expect-error private
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          actor.logger('test');
          assert.equal(
            newLogger.mock.callCount(),
            0,
            'new logger was called before unpatching',
          );
          assert.equal(
            evenNewerLogger.mock.callCount(),
            1,
            'even newer logger was not called once before unpatching',
          );

          unpatchActor(actor);
          // @ts-expect-error private
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          actor.logger('test');

          assert.equal(
            newLogger.mock.callCount(),
            1,
            'new logger was not called once after unpatching',
          );
        });
      });
    });
  });
});
