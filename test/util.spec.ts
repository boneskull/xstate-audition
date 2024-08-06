import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {createAbortablePromiseKit, startTimer, wait} from '../src/util.js';

describe('xstate-audition', () => {
  describe('util', () => {
    describe('createAbortablePromiseKit()', () => {
      it('should return an AbortablePromiseKit', () => {
        const kit = createAbortablePromiseKit<void>();
        assert.ok(kit.abortController instanceof AbortController);
        assert.ok(kit.promise instanceof Promise);
        assert.ok(typeof kit.reject === 'function');
        assert.ok(typeof kit.resolve === 'function');
      });

      it('should resolve the promise when resolve is called', async () => {
        const kit = createAbortablePromiseKit<string>();
        kit.resolve('test');
        const result = await kit.promise;
        assert.equal(result, 'test');
      });

      it('should reject the promise when reject is called', async () => {
        const kit = createAbortablePromiseKit();
        const error = new Error('test error');
        kit.reject(error);
        await assert.rejects(kit.promise, error);
      });

      it('should reject the promise if the signal is already aborted', async () => {
        const abortController = new AbortController();
        const err = new Error('already aborted');
        abortController.abort(err);
        const kit = createAbortablePromiseKit(abortController);
        await assert.rejects(kit.promise, err);
      });

      it('should reject the promise when the signal is aborted', async () => {
        const kit = createAbortablePromiseKit();
        const error = new Error('aborted');
        kit.abortController.abort(error);
        await assert.rejects(kit.promise, error);
      });

      it('should abort the signal after the promise is fulfilled', async () => {
        const kit = createAbortablePromiseKit<void>();
        const signal = kit.abortController.signal;
        kit.resolve();
        await kit.promise;
        assert.ok(signal.aborted);
      });

      it('should abort the signal after the promise is rejected', async () => {
        const kit = createAbortablePromiseKit();
        const signal = kit.abortController.signal;
        kit.reject();
        await kit.promise.catch(() => {});
        assert.ok(signal.aborted);
      });
    });

    describe('startTimer()', () => {
      describe('when timeout is Infinity', () => {
        // TODO: this would be better with a spy
        it('should not start a timer', async () => {
          const ac = new AbortController();
          const timeout = Infinity;
          startTimer(ac, timeout);
          await wait(100);
          assert.ok(!ac.signal.aborted);
        });
      });

      it('should start a timer and abort after the timeout', async () => {
        const ac = new AbortController();
        const timeout = 10;
        const message = 'Timeout exceeded';

        startTimer(ac, timeout, message);
        await wait(timeout + 50);

        assert.ok(ac.signal.aborted);
        assert.equal((ac.signal.reason as Error).message, message);
      });

      it('should use default timeout message if none is provided', async () => {
        const ac = new AbortController();
        const timeout = 10;

        startTimer(ac, timeout);

        await wait(timeout + 50);

        assert.ok(ac.signal.aborted);
        assert.equal(
          (ac.signal.reason as Error).message,
          `Timeout of ${timeout}ms exceeded`,
        );
      });

      it('should not abort if the timeout is not reached', async () => {
        const ac = new AbortController();
        const timeout = 10;

        startTimer(ac, timeout);

        await wait(0);

        try {
          assert.ok(!ac.signal.aborted);
        } finally {
          ac.abort();
        }
      });
    });
  });
});
