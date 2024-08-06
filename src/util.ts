/**
 * Decorator to bind a class method to a context (defaulting to `this`)
 *
 * @param ctx Alternate context, if needed
 */
import inspector from 'node:inspector';

import {type AbortablePromiseKit, type AuditionOptions} from './types.js';

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

const abortSignalListeners = new WeakMap<AbortSignal, EventListener>();

/**
 * Creates a generic promise that can be aborted via an `AbortController`,
 * packaged in an {@link AbortablePromiseKit}.
 *
 * If a `abortController` is provided and its signal is already aborted, the
 * `promise` property in the return value will reject immediately.
 *
 * @param abortController `AbortController`, if any
 * @returns An {@link AbortablePromiseKit}
 */
export function createAbortablePromiseKit<T>(
  abortController = new AbortController(),
): AbortablePromiseKit<T> {
  /**
   * Tracks the listener for the `abort` event on the `AbortSignal`.
   *
   * @param signal AbortSignal
   * @param listener Listener for `abort` event
   */
  const addAbortListener = (
    signal: AbortSignal,
    listener: EventListener,
  ): void => {
    signal.addEventListener('abort', listener);
    abortSignalListeners.set(signal, listener);
  };

  /**
   * Looks for the listener for the `abort` event on the `AbortSignal` and
   * removes it.
   *
   * @param signal AbortSignal
   */
  const removeAbortListener = (signal: AbortSignal): void => {
    const listener = abortSignalListeners.get(signal);
    if (listener) {
      signal.removeEventListener('abort', listener);
      abortSignalListeners.delete(signal);
    }
  };

  const {signal} = abortController;

  let resolve!: (value: PromiseLike<T> | T) => void;
  let reject!: (reason: unknown) => void;

  const promise = new Promise<T>((resolve_, reject_): void => {
    resolve = resolve_;
    reject = reject_;
  }).finally((): void => {
    removeAbortListener(signal);
    abortController.abort();
  });

  if (signal.aborted) {
    reject(signal.reason);
  } else {
    // no point in adding a listener if it's already aborted
    addAbortListener(signal, (): void => {
      reject(signal.reason);
    });
  }

  return {abortController, promise, reject, resolve};
}

export function applyDefaults<T extends AuditionOptions>(
  options?: T,
): Omit<T, keyof AuditionOptions> & Required<AuditionOptions> {
  const {
    inspector = noop,
    isDebugMode = defaultIsDebugMode,
    logger = noop,
    stop = false,
    timeout: originalTimeout,
    ...rest
  } = options ?? {};

  const timeout = isDebugMode()
    ? Infinity
    : (originalTimeout ?? DEFAULT_TIMEOUT);

  return {
    inspector,
    isDebugMode,
    logger,
    stop,
    timeout,
    ...rest,
  } as Omit<T, keyof AuditionOptions> & Required<AuditionOptions>;
}
