import {expectTypeOf} from 'expect-type';
import {strict as assert} from 'node:assert';
import {beforeEach, describe, it} from 'node:test';
import {type Actor, createActor} from 'xstate';

import {
  runUntilEventSent,
  runUntilEventSentWith,
  waitForEventSent,
  waitForEventSentWith,
} from '../src/index.js';
import {
  type receiverMachine,
  type ReceiverMachineEvent,
  senderMachine,
} from './fixture.js';
import {testCurried} from './harness.js';

describe('xstate-audition', () => {
  describe('until-event-sent', () => {
    describe('runUntilEventSent()', () => {
      let actor: Actor<typeof senderMachine>;

      beforeEach(() => {
        actor = createActor(senderMachine);
      });

      testCurried(
        runUntilEventSent,
        (actual) => {
          assert.deepEqual(actual, [{type: 'PING'}]);
        },
        senderMachine,
        [['PING']],
        {
          shouldStop: true,
        },
      );

      it('should return a value with the expected type', async () => {
        const value = await runUntilEventSent<
          typeof actor,
          Actor<typeof receiverMachine>,
          ['PING']
        >(actor, ['PING']);

        expectTypeOf<typeof value>().toEqualTypeOf<[ReceiverMachineEvent]>();
      });
    });

    describe('waitForEventSent()', () => {
      let actor: Actor<typeof senderMachine>;

      beforeEach(() => {
        actor = createActor(senderMachine);
      });

      testCurried(
        waitForEventSent,
        (actual) => {
          assert.deepEqual(actual, [{type: 'PING'}]);
        },
        senderMachine,
        [['PING']],
      );

      it('should return a value with the expected type', async () => {
        const value = await waitForEventSent<
          typeof actor,
          Actor<typeof receiverMachine>,
          ['PING']
        >(actor, ['PING']);

        expectTypeOf<typeof value>().toEqualTypeOf<[ReceiverMachineEvent]>();
      });
    });

    describe('runUntilEventSentWith()', () => {
      testCurried(
        runUntilEventSentWith,
        (actual: ReceiverMachineEvent[]) => {
          assert.deepEqual(actual, [{type: 'PING'}]);
        },
        senderMachine,
        [{}, ['PING']],
        {
          shouldStop: true,
        },
      );

      describe('when provided a target', () => {
        it('should find an event sent to the target', async () => {
          const actor = createActor(senderMachine);

          const result = await runUntilEventSentWith(
            actor,
            {otherActorId: 'ReceiverMachine'},
            ['PING'],
          );

          assert.deepEqual(result, [{type: 'PING'}]);
        });

        it('should not find an event sent to a different target', async () => {
          const actor = createActor(senderMachine);

          await assert.rejects(
            runUntilEventSentWith(actor, {otherActorId: 'HotDogMachine'}, [
              'PING',
            ]),
            (err) => {
              assert.match(
                (err as Error).message,
                /Actor did not send event\(s\)/,
              );

              return true;
            },
          );
        });
      });

      it('should timeout if the actor does not complete in time', async () => {
        const timeout = 10; // Set a short timeout for testing

        const actor = createActor(senderMachine);

        await assert.rejects(
          runUntilEventSentWith(actor, {timeout}, ['PING']),
          (err) => {
            assert.match(
              (err as Error).message,
              /Actor did not send event\(s\)/,
            );

            return true;
          },
        );
      });
    });

    describe('waitForEventSentWith()', () => {
      testCurried(
        waitForEventSentWith,
        (actual: ReceiverMachineEvent[]) => {
          assert.deepEqual(actual, [{type: 'PING'}]);
        },
        senderMachine,
        [{}, ['PING']],
      );

      describe('when provided a target', () => {
        it('should find an event sent to the target', async () => {
          const actor = createActor(senderMachine);

          const result = await waitForEventSentWith(
            actor,
            {otherActorId: 'ReceiverMachine'},
            ['PING'],
          );

          assert.deepEqual(result, [{type: 'PING'}]);
        });

        it('should not find an event sent to a different target', async () => {
          const actor = createActor(senderMachine);

          await assert.rejects(
            waitForEventSentWith(actor, {otherActorId: 'HotDogMachine'}, [
              'PING',
            ]),
            (err) => {
              assert.match(
                (err as Error).message,
                /Actor did not send event\(s\)/,
              );

              return true;
            },
          );
        });
      });

      it('should timeout if the actor does not complete in time', async () => {
        const timeout = 10; // Set a short timeout for testing

        const actor = createActor(senderMachine);

        await assert.rejects(
          waitForEventSentWith(actor, {timeout}, ['PING']),
          (err) => {
            assert.match(
              (err as Error).message,
              /Actor did not send event\(s\)/,
            );

            return true;
          },
        );
      });
    });
  });
});
