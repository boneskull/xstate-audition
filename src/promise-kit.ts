/**
 * Provides {@link AbortablePromiseKit} and {@link createAbortablePromiseKit}.
 *
 * @module
 */

/**
 * Object containing everything you need to abort a `Promise`!
 *
 * @internal
 */
export type AbortablePromiseKit<T> = {
  /**
   * An `AbortController` (either new or pre-owned)
   */
  abortController: AbortController;

  /**
   * A `Promise` which rejects when `abortController`'s `signal` is aborted
   */
  promise: Promise<T>;

  /**
   * The `reject` function of `promise`.
   *
   * @param reason Should be an `Error`
   */
  reject: (reason?: unknown) => void;

  /**
   * The `resolve` function of `promise`
   *
   * @param value Whatever `promise` should resolve with
   */
  resolve: (value: PromiseLike<T> | T) => void;
};

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

  const promise = new Promise<T>((resolve_, reject_) => {
    resolve = resolve_;
    reject = reject_;
  }).finally(() => {
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

const abortSignalListeners = new WeakMap<AbortSignal, EventListener>();
