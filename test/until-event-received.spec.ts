import {expectTypeOf} from 'expect-type';
import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';
import {type Actor} from 'xstate';

import {
  createActorWith,
  runUntilEventReceived,
  runUntilEventReceivedWith,
} from '../src/index.js';
import {receiverMachine, type ReceiverMachineEvent} from './fixture.js';
import {testCurried} from './harness.js';

describe('xstate-audition', () => {
  describe('until-event-received', () => {
    const createActor = createActorWith<typeof receiverMachine>({
      logger: () => {},
    });

    describe('runUntilEventReceived()', () => {
      testCurried(
        runUntilEventReceived,
        (actual: [ReceiverMachineEvent]) => {
          assert.deepEqual(actual, [{type: 'PING'}]);
        },
        receiverMachine,
        [['PING']],
        {
          resolver: (actor: Actor<typeof receiverMachine>) => {
            actor.send({type: 'PING'});
          },
          shouldStop: true,
        },
      );

      describe('when provided an actor and list of event types', () => {
        it('should return a value with the expected type', async () => {
          const actor = createActor(receiverMachine);

          const promise = runUntilEventReceived(actor, ['PING']);

          actor.send({type: 'PING'});

          const _value = await promise;

          expectTypeOf<typeof _value>().toEqualTypeOf<[ReceiverMachineEvent]>();
        });
      });
    });

    describe('runUntilEventReceivedWith()', () => {
      testCurried(
        runUntilEventReceivedWith,
        (actual: [ReceiverMachineEvent]) => {
          assert.deepEqual(actual, [{type: 'PING'}]);
        },
        receiverMachine,
        [{}, ['PING']],
        {
          resolver: (actor: Actor<typeof receiverMachine>) => {
            actor.send({type: 'PING'});
          },
          shouldStop: true,
        },
      );

      describe('when provided an actor and options', () => {
        it('should timeout if the actor does not complete in time', async () => {
          const timeout = 10; // Set a short timeout for testing

          const actor = createActor(receiverMachine);

          await assert.rejects(
            runUntilEventReceivedWith(actor, {timeout}, ['PING']),
            (err) => {
              assert.match(
                (err as Error).message,
                /Actor did not complete in \d+ms/,
              );

              return true;
            },
          );
        });
      });
    });
  });
});
