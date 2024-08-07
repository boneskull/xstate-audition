import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';

import {createAbortablePromiseKit} from '../src/promise-kit.js';

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
  });
});
