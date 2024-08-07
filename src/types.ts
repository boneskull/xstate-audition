/**
 * Common types
 *
 * @module types
 */

import type * as xs from 'xstate';

/**
 * Any actor logic which can theoretically produce output upon completion
 */
export type OutputtableLogic =
  | xs.ActorLogic<xs.AnyMachineSnapshot, any, any, any, any>
  | xs.ActorLogic<xs.PromiseSnapshot<any, any>, any, any, any, any>;

/**
 * Any actor logic that can receive events
 */
export type ListenableLogic =
  | xs.ActorLogic<xs.AnyMachineSnapshot, any, any, any, any>
  | xs.ActorLogic<xs.CallbackSnapshot<any>, any, any, any, any>
  | xs.ActorLogic<xs.TransitionSnapshot<any>, any, any, any, any>;

/**
 * Any actor logic which can theoretically emit snapshots
 */
export type SnapshottableLogic =
  | OutputtableLogic
  | xs.ActorLogic<xs.ObservableSnapshot<any, any>, any, any, any, any>
  | xs.ActorLogic<xs.TransitionSnapshot<any>, any, any, any, any>;

/**
 * Core options for all methods
 */
export type AuditionOptions = {
  /**
   * Default inspector to use
   *
   * @param An {@link xs.InspectionEvent InspectionEvent}
   */
  inspector?: InspectorFn | xs.Observer<xs.InspectionEvent>;

  /**
   * If a debugger is detected, this should return true
   *
   * @returns `true` if in debug mode
   */
  isDebugMode?: () => boolean;

  /**
   * Default logger to use
   *
   * @param Anything To be logged
   */
  logger?: LoggerFn;

  /**
   * If `true`, the actor will be stopped after a successful operation
   */
  stop?: boolean;

  /**
   * Default timeout for those methods which accept a timeout.
   */
  timeout?: number;
};

/**
 * Frankenpromise that is both a `Promise` and an {@link xs.Actor}.
 *
 * Returned by some methods in {@link ActorRunner}
 */
export type ActorThenable<
  T extends xs.AnyActorLogic,
  Out = void,
> = Promise<Out> & xs.Actor<T>;

/**
 * An inspector function for an actor
 */
export type InspectorFn = (evt: xs.InspectionEvent) => void;

/**
 * A logger function for an actor
 */
export type LoggerFn = (...args: any[]) => void;

/**
 * Lookup for event/Event-event based on type
 */
export type EventFromEventType<
  T extends xs.AnyActorLogic,
  K extends ActorEventType<T>,
> = xs.ExtractEvent<xs.EventFromLogic<T>, K>;

/**
 * Any event or Event-event from an actor
 */
export type ActorEvent<T extends xs.AnyActorLogic> =
  | xs.EventFrom<T>
  | xs.EventFromLogic<T>;

/**
 * A tuple of events Event by an actor, based on a {@link ActorEventTypeTuple}
 */
export type ActorEventTuple<
  T extends xs.AnyActorLogic,
  EventTypes extends ActorEventTypeTuple<T>,
> = {[K in keyof EventTypes]: EventFromEventType<T, EventTypes[K]>};

/**
 * The `type` prop of any event or Event event from an actor
 */
export type ActorEventType<T extends xs.AnyActorLogic> =
  xs.EventFromLogic<T>['type'];

/**
 * A tuple of event types (event names) Event by an actor
 */
export type ActorEventTypeTuple<T extends xs.AnyActorLogic> = [
  ActorEventType<T>,
  ...ActorEventType<T>,
];

export type AuditionEventOptions = {
  target?: RegExp | string;
} & AuditionOptions;
