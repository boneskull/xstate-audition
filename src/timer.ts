/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import type * as xs from 'xstate';

import {noop} from './util.js';

/**
 * Starts a timer that will abort if the timeout has expired.
 *
 * If `timeout` is not a positive finite number, no timer will be created.
 *
 * @param abortController AbortController
 * @param timeout Timeout in ms; use 0, `Infinity` or a negative value for no
 *   timeout
 * @param message Timeout message
 */
export function startTimer(
  actor: xs.AnyActorRef,
  abortController: AbortController,
  timeout: number,
  message?: string,
): void {
  if (timeout === Infinity || timeout <= 0 || isNaN(timeout)) {
    return;
  }

  void wait(timeout, abortController.signal).then(() => {
    if (abortController.signal.aborted) {
      return;
    }
    abortController.abort(
      new Error(message || `Timeout of ${timeout}ms exceeded`),
    );
    actor.stop();
  }, noop);
}

/**
 * Waits
 *
 * @remarks
 * Node.js provides `scheduler.wait()`, but we cannot use it since this package
 * should be able to run in the browser.
 * @param timeout How long to wait in milliseconds
 * @returns A promise that resolves after `timeout` milliseconds
 */

export async function wait(
  timeout: number,
  signal: AbortSignal,
): Promise<void> {
  let listener: () => void;

  let t: NodeJS.Timeout;

  return new Promise<void>((resolve, reject) => {
    t = setTimeout(() => {
      if (signal.aborted) {
        reject();
      } else {
        resolve();
      }
    }, timeout);

    listener = () => {
      clearTimeout(t);
      reject();
    };

    signal.addEventListener('abort', listener);
  }).finally(() => {
    clearTimeout(t);
    signal.removeEventListener('abort', listener);
  });
}
