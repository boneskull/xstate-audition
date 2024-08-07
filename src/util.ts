/**
 * Decorator to bind a class method to a context (defaulting to `this`)
 *
 * @param ctx Alternate context, if needed
 */
import inspector from 'node:inspector';

/**
 * That's a no-op, folks
 */
export const noop = () => {};

/**
 * Default timeout (in ms) for any of the "run until" methods in
 * {@link ActorRunner}
 *
 * This must be set to a lower value than the default timeout for the test
 * runner.
 */
export const DEFAULT_TIMEOUT = 1000;

/**
 * Get the first element of an array
 *
 * @param arr Non-empty array
 * @returns First element of the array
 * @throws If the array is empty
 */
export function head<T>(arr: T[]): T {
  assertNonEmptyArray(arr);
  return arr[0];
}

/**
 * Assertion for non-empty array
 *
 * @param arr Any array
 */
function assertNonEmptyArray<T>(arr: T[]): asserts arr is [T, ...T[]] {
  if (!arr.length) {
    throw new Error('Array is empty');
  }
}

let debugMode: boolean | undefined;

/**
 * If this returns `true`, we're trying to debug some tests.
 */
export function defaultIsDebugMode(): boolean {
  const isDebug = Boolean(inspector.url());

  if (debugMode === undefined && isDebug) {
    // this should only happen once
    console.error('xstate-audition: debug mode detected; timeouts disabled');
  }
  debugMode = isDebug;
  return debugMode;
}

/**
 * Starts a timer that will abort if the timeout has expired.
 *
 * If `timeout` is `Infinity`, no timer will be created.
 *
 * @param abortController AbortController
 * @param timeout Timeout in ms
 * @param message Timeout message
 */
export function startTimer(
  abortController: AbortController,
  timeout: number,
  message?: string,
): void {
  if (timeout === Infinity) {
    return;
  }
  void wait(timeout).then(() => {
    abortController.abort(
      new Error(message || `Timeout of ${timeout}ms exceeded`),
    );
  }, noop);
}

/**
 * Waits
 *
 * @param timeout How long to wait in milliseconds
 * @returns A promise that resolves after `timeout` milliseconds
 */
export function wait(timeout: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
