import {
  Actor,
  type AnyActorLogic,
  type AnyActorRef,
  type AnyStateMachine,
  type AnyTransitionDefinition,
  type InspectionEvent,
  StateMachine,
} from 'xstate';

export type InspectedMicrostepEvent = {
  _transitions: AnyTransitionDefinition[];
  type: '@xstate.microstep';
} & InspectionEvent;

export function isActorRef(value: unknown): value is AnyActorRef {
  return Boolean(
    value instanceof Actor ||
      (isObject(value) &&
        isString(value.id) &&
        isString(value.sessionId) &&
        isObject(value.system) &&
        value.src),
  );
}

export function isInspectedMicrostepEvent(
  value: InspectionEvent,
): value is InspectedMicrostepEvent {
  return value.type === '@xstate.microstep' && '_transitions' in value;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
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
 * Type guard for `string`
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}
