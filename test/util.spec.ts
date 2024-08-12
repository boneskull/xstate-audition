import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';

import {startTimer, wait} from '../src/timer.js';

describe('xstate-audition', () => {
  describe('util', () => {
    describe('startTimer()', () => {
      describe('when timeout is Infinity', () => {
        // TODO: this would be better with a spy
        it('should not start a timer', async () => {
          const ac = new AbortController();

          const timeout = Infinity;

          startTimer(ac, timeout);
          await wait(100, ac.signal);
          assert.ok(!ac.signal.aborted);
        });
      });

      it('should start a timer and abort after the timeout', async () => {
        const ac = new AbortController();

        const timeout = 10;

        const message = 'Timeout exceeded';

        startTimer(ac, timeout, message);
        try {
          await wait(timeout + 50, ac.signal);
        } catch {}

        assert.ok(ac.signal.aborted);
        assert.equal((ac.signal.reason as Error).message, message);
      });

      it('should use default timeout message if none is provided', async () => {
        const ac = new AbortController();

        const timeout = 10;

        startTimer(ac, timeout);
        try {
          await wait(timeout + 50, ac.signal);
        } catch {}

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

        await wait(0, ac.signal);

        try {
          assert.ok(!ac.signal.aborted);
        } finally {
          ac.abort();
        }
      });
    });
  });
});
