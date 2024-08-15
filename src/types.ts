/**
 * Common types
 *
 * @module
 */
import type * as xs from 'xstate';

/**
 * A tuple of events Event by an actor, based on a {@link ActorEventTypeTuple}
 */
export type ActorEventTuple<
  Actor extends AnyActor,
  EventTypes extends Readonly<ActorEventTypeTuple<Actor>>,
> = {
  -readonly [K in keyof EventTypes]: EventFromEventType<Actor, EventTypes[K]>;
};

/**
 * The `type` prop of any event or Event event from an actor
 */
export type ActorEventType<Actor extends AnyActor> =
  xs.EventFromLogic<Actor['logic']> extends xs.EventObject
    ? xs.EventFromLogic<Actor['logic']>['type']
    : string;

/**
 * A tuple of event types (event names) Event by an actor
 */
export type ActorEventTypeTuple<Actor extends AnyActor> = ReadableArray<
  [ActorEventType<Actor>, ...ActorEventType<Actor>[]]
>;

export type AnyActor = xs.AnyActor;

export type AnyListenableActor = xs.Actor<AnyEventReceiverLogic>;

export type AnyOutputtableActor = xs.Actor<AnyTerminalLogic>;

export type AnySnapshottableActor = xs.Actor<AnySnapshotEmitterLogic>;

export type AnyStateMachineActor = xs.Actor<xs.AnyStateMachine>;

export type AuditionEventOptions = {
  otherActorId?: RegExp | string;
} & AuditionOptions;

/**
 * Options for all `*With()` functions
 */
export type AuditionOptions = {
  /**
   * Default inspector to use
   *
   * @param An {@link xs.InspectionEvent InspectionEvent}
   */
  inspector?: InspectorFn | xs.Observer<xs.InspectionEvent>;

  /**
   * Default logger to use
   *
   * @param Anything To be logged
   */
  logger?: LoggerFn;

  /**
   * Default timeout (in milliseconds) for those methods which accept a timeout.
   *
   * @defaultValue 1000
   */
  timeout?: number;
};

/**
 * Given a XState Actor and an {@link EventObject.type event type} (the `type`
 * field of an `EventObject`), returns the type of the corresponding event.
 *
 * Does not apply to "emitted" events.
 *
 * @template Actor The State Machine Actor
 * @template EventType The event type (the `type` field of the `EventObject`)
 */
export type EventFromEventType<
  Actor extends AnyActor,
  EventType extends ActorEventType<Actor>,
> = xs.ExtractEvent<xs.EventFromLogic<Actor['logic']>, EventType>;

/**
 * An inspector function or XState `Observer` for an Actor
 */
export type InspectorFn = NonNullable<xs.ActorOptions<any>['inspect']>;

/**
 * Internal options for functions accepting {@link AuditionEventOptions}.
 *
 * @internal
 */
export type InternalAuditionEventOptions = AuditionEventOptions &
  InternalAuditionOptions;

/**
 * Internal options for all `*With()` functions
 *
 * @internal
 */
export type InternalAuditionOptions = {
  /**
   * If `true`, the actor will be stopped after a successful operation
   */
  stop: boolean;
} & AuditionOptions;

/**
 * A logger function for an XState Actor
 */
export type LoggerFn = NonNullable<xs.ActorOptions<any>['logger']>;

/**
 * An array or tuple which is either readonly or mutable
 */
export type ReadableArray<T extends readonly any[]> = Readonly<T> | T;

/**
 * Any actor logic that can receive events
 *
 * @see {@link https://stately.ai/docs/actors#actor-logic-capabilities}
 */
export type AnyEventReceiverLogic =
  | AnyStateMachineLogic
  | SomeTransitionLogic
  | xs.ActorLogic<xs.CallbackSnapshot<any>, any, any, any, any>;

/**
 * Any actor logic that can send events
 *
 * @see {@link https://stately.ai/docs/actors#actor-logic-capabilities}
 */
export type AnyEventSenderLogic = xs.AnyActorLogic;

/**
 * Any actor logic which can theoretically emit snapshots
 *
 * @see {@link https://stately.ai/docs/actors#actor-logic-capabilities}
 */
export type AnySnapshotEmitterLogic =
  | AnyTerminalLogic
  | SomeTransitionLogic
  | xs.ActorLogic<xs.ObservableSnapshot<any, any>, any, any, any, any>;

/**
 * Any state machine logic
 *
 * @see {@link https://stately.ai/docs/actors#actor-logic-capabilities}
 */
export type AnyStateMachineLogic = xs.AnyStateMachine;

/**
 * Any actor logic which can theoretically terminate and/or produce output.
 *
 * @see {@link https://stately.ai/docs/actors#actor-logic-capabilities}
 */
export type AnyTerminalLogic =
  | AnyStateMachineLogic
  | xs.ActorLogic<xs.PromiseSnapshot<any, any>, any, any, any, any>;

/**
 * Any Transition Actor logic
 *
 * @see {@link https://stately.ai/docs/actors#fromtransition}
 */
export type SomeTransitionLogic = xs.ActorLogic<
  xs.TransitionSnapshot<any>,
  any,
  any,
  any,
  any
>;
