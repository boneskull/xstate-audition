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
  EventTypes extends ActorEventTypeTuple<Actor>,
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
export type ActorEventTypeTuple<Actor extends AnyActor> = [
  ActorEventType<Actor>,
  ...ActorEventType<Actor>[],
];

export type AnyActor = xs.AnyActor;

export type AnyListenableActor = xs.Actor<ListenableLogic>;

export type AnyOutputtableActor = xs.Actor<OutputtableLogic>;

export type AnySnapshottableActor = xs.Actor<SnapshottableLogic>;

export type AnyStateMachineActor = xs.Actor<xs.AnyStateMachine>;

export type AuditionEventOptions = {
  otherActorId?: RegExp | string;
} & AuditionOptions;

export type InternalAuditionEventOptions = {
  otherActorId?: RegExp | string;
} & InternalAuditionOptions;

/**
 * Options for all `*With()` functions
 *
 * @internal
 */
export type InternalAuditionOptions = {
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
   * If `true`, the actor will be stopped after a successful operation
   */
  stop: boolean;

  /**
   * Default timeout for those methods which accept a timeout.
   */
  timeout?: number;
};

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
   * Default timeout for those methods which accept a timeout.
   */
  timeout?: number;
};

/**
 * Lookup for event/Event-event based on type
 */
export type EventFromEventType<
  Actor extends AnyActor,
  K extends ActorEventType<Actor>,
> = xs.ExtractEvent<xs.EventFromLogic<Actor['logic']>, K>;

/**
 * An inspector function for an actor
 */
export type InspectorFn = (evt: xs.InspectionEvent) => void;

/**
 * Any actor logic that can receive events
 */
export type ListenableLogic =
  | xs.ActorLogic<xs.AnyMachineSnapshot, any, any, any, any>
  | xs.ActorLogic<xs.CallbackSnapshot<any>, any, any, any, any>
  | xs.ActorLogic<xs.TransitionSnapshot<any>, any, any, any, any>;

/**
 * A logger function for an actor
 */
export type LoggerFn = (...args: any[]) => void;

/**
 * Any actor logic which can theoretically produce output upon completion
 */
export type OutputtableLogic =
  | xs.ActorLogic<xs.AnyMachineSnapshot, any, any, any, any>
  | xs.ActorLogic<xs.PromiseSnapshot<any, any>, any, any, any, any>;

/**
 * Any actor logic which can theoretically emit snapshots
 */
export type SnapshottableLogic =
  | OutputtableLogic
  | xs.ActorLogic<xs.ObservableSnapshot<any, any>, any, any, any, any>
  | xs.ActorLogic<xs.TransitionSnapshot<any>, any, any, any, any>;
