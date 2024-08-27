import {expectTypeOf} from 'expect-type';
import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';
import {createActor, type PromiseSnapshot, type SnapshotFrom} from 'xstate';

import {runUntilSnapshot, runUntilSnapshotWith} from '../src/until-snapshot.js';
import {promiseLogic} from './fixture.js';
import {testCurried} from './harness.js';

describe('xstate-audition', () => {
  describe('until-snapshot', () => {
    const predicate = () => true;

    describe('runUntilSnapshot()', () => {
      testCurried(
        runUntilSnapshot,
        (actual: SnapshotFrom<typeof promiseLogic>) => {
          assert.equal(actual.status, 'active');
        },
        promiseLogic,
        [predicate],
        {shouldStop: true},
      );

      it('should return a value with the expected type', async () => {
        const _value = await runUntilSnapshot(
          createActor(promiseLogic),
          predicate,
        );

        expectTypeOf<typeof _value>().toEqualTypeOf<
          PromiseSnapshot<string, void>
        >();
      });

      it('should fulfill with the snapshot found by the predicate', async () => {
        const actual = await runUntilSnapshot(
          createActor(promiseLogic),
          predicate,
        );

        assert.equal(actual.status, 'active');
      });
    });

    describe('runUntilSnapshotWith()', () => {
      testCurried(
        runUntilSnapshotWith,
        (actual: SnapshotFrom<typeof promiseLogic>) => {
          assert.equal(actual.status, 'active');
        },
        promiseLogic,
        [{}, predicate],
        {shouldStop: true},
      );

      it('should reject if timeout exceeded', async () => {
        const timeout = 10; // Set a short timeout for testing

        const actor = createActor(promiseLogic);

        await assert.rejects(
          runUntilSnapshotWith(actor, {timeout}, () => false),
          (err) => {
            assert.match(
              (err as Error).message,
              new RegExp(`Snapshot did not match predicate in ${timeout}ms`),
            );

            return true;
          },
        );
      });
    });
  });
});
