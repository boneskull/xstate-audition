/**
 * Decorator to bind a class method to a context (defaulting to `this`)
 *
 * @param ctx Alternate context, if needed
 */
import type {
  AnyActorRef,
  AnyTransitionDefinition,
  InspectionEvent,
} from 'xstate';

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
 * An inspection event which represents a "microstep"
 *
 * @remarks
 * This type exists in the XState codebase, but is not exported.
 */
export type InspectedMicrostepEvent = InspectionEvent & {
  _transitions: AnyTransitionDefinition[];
  type: '@xstate.microstep';
};

export type NonEmptyArray<T> = [T, ...T[]];

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
 * Type guard for an {@link AnyActorRef ActorRef}.
 *
 * @param value Any value
 * @returns `true` if the value is an {@link AnyActorRef ActorRef}
 */
export function isActorRef(value: unknown): value is AnyActorRef {
  return !!(
    value &&
    typeof value === 'object' &&
    'id' in value &&
    value.id &&
    'sessionId' in value &&
    value.sessionId &&
    'getSnapshot' in value &&
    typeof value.getSnapshot === 'function' &&
    'send' in value &&
    typeof value.send === 'function'
  );
}

/**
 * Type guard for `InspectedMicrostepEvent`
 *
 * @remarks
 * XState does not export this type, unfortunately.
 * @param value Any inspection event
 * @returns `true` if the event is an inspected microstep event
 */
export function isInspectedMicrostepEvent(
  value: InspectionEvent,
): value is InspectedMicrostepEvent {
  return value.type === '@xstate.microstep' && '_transitions' in value;
}

/**
 * Assertion for non-empty array
 *
 * @param arr Any array
 */
function assertNonEmptyArray<T>(arr: T[]): asserts arr is NonEmptyArray<T> {
  if (!isNonEmptyArray(arr)) {
    throw new Error('Array is empty');
  }
}

function isNonEmptyArray<T>(arr: T[]): arr is NonEmptyArray<T> {
  return arr.length > 0;
}
