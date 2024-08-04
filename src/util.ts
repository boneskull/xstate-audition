/**
 * Decorator to bind a class method to a context (defaulting to `this`)
 *
 * @param ctx Alternate context, if needed
 */
import inspector from 'node:inspector';
import {type AnyActorLogic, type AnyStateMachine, StateMachine} from 'xstate';

/**
 * Decorator which binds a class' method to a context post-instantiation.
 *
 * Defaults to `this` if no explicit context is provided.
 *
 * @param ctx Alternative context; defaults to `this`
 * @returns A decorator which binds the method to the context
 */
export function bind<
  TThis extends object,
  TArgs extends any[] = unknown[],
  TReturn = unknown,
  TContext extends object = TThis,
>(ctx?: TContext) {
  return function (
    target: (this: TThis, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<
      TThis,
      (this: TThis, ...args: TArgs) => TReturn
    >,
  ) {
    context.addInitializer(function (this: TThis) {
      const func = context.access.get(this);

      // @ts-expect-error FIXME
      this[context.name] = func.bind(ctx ?? this);
    });
  };
}

/**
 * Type guard to determine if some actor logic is a state machine
 *
 * @param actorLogic Any actor logic
 * @returns `true` if `actorLogic` is a state machine
 */
export function isStateMachine<T extends AnyActorLogic>(
  actorLogic: T,
): actorLogic is AnyStateMachine & T {
  return actorLogic instanceof StateMachine;
}

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

/**
 * Type guard for `string`
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

let debugMode: boolean | undefined;

/**
 * If this returns `true`, we're trying to debug some tests.
 */
export function isDebugMode() {
  const isDebug = Boolean(inspector.url());
  if (debugMode === undefined && isDebug) {
    // this should only happen once
    console.error('xstate-audition: debug mode detected; timeouts disabled');
  }
  debugMode = isDebug;
  return debugMode;
}
