import type * as xs from 'xstate';

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
 * Any event or emitted-event from an actor
 */
export type ActorEvent<T extends xs.AnyActorLogic> =
  | xs.EmittedFrom<T>
  | xs.EventFromLogic<T>;

/**
 * A tuple of events emitted by an actor, based on a {@link ActorEventTypeTuple}
 */
export type ActorEventTuple<
  T extends xs.AnyActorLogic,
  EventTypes extends ActorEventTypeTuple<T>,
> = {[K in keyof EventTypes]: EventFromEventType<T, EventTypes[K]>};

export type ActorEmittedTuple<
  T extends xs.AnyStateMachine,
  EmittedTypes extends ActorEmittedTypeTuple<T>,
> = {[K in keyof EmittedTypes]: EventFromEmitted<T, EmittedTypes[K]>};

/**
 * The `type` prop of any event or emitted event from an actor
 */
export type ActorEventType<T extends xs.AnyActorLogic> =
  xs.EventFromLogic<T>['type'];

export type ActorEmittedType<T extends xs.AnyActorLogic> =
  xs.EmittedFrom<T>['type'];

/**
 * A tuple of event types (event names) emitted by an actor
 */
export type ActorEventTypeTuple<T extends xs.AnyActorLogic> = [
  ActorEventType<T>,
  ...ActorEventType<T>,
];

export type ActorEmittedTypeTuple<T extends xs.AnyStateMachine> = [
  ActorEmittedType<T>,
  ...ActorEmittedType<T>,
];

/**
 * Any actor logic which can theoretically produce output upon completion
 */
export type ActorLogicWithOutput =
  | xs.ActorLogic<xs.AnyMachineSnapshot, any, any, any, any>
  | xs.ActorLogic<xs.PromiseSnapshot<any, any>, any, any, any, any>;

export type ActorLogicWithListener =
  | xs.ActorLogic<xs.AnyMachineSnapshot, any, any, any, any>
  | xs.ActorLogic<xs.CallbackSnapshot<any>, any, any, any, any>
  | xs.ActorLogic<xs.TransitionSnapshot<any>, any, any, any, any>;

/**
 * Any actor logic which can theoretically emit snapshots
 */
export type ActorLogicWithSnapshot =
  | ActorLogicWithOutput
  | xs.ActorLogic<xs.ObservableSnapshot<any, any>, any, any, any, any>
  | xs.ActorLogic<xs.TransitionSnapshot<any>, any, any, any, any>;

/**
 * Core options for all methods
 */
export type AuditionOptions = {
  /**
   * If `true`, the actor will be stopped after a successful operation
   */
  stop?: boolean;

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
   * Default timeout for those methods which accept a timeout.
   */
  timeout?: number;
};

/**
 * Actor runner options _without_ an existing `Actor` and with an optional
 * `target` `Actor`.
 */
export type ActorRunnerOptionsWithTarget = {
  target?: string | xs.AnyActorRef;
} & AuditionOptions;

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
 * Lookup for event/emitted-event based on type
 */
export type EventFromEventType<
  T extends xs.AnyActorLogic,
  K extends ActorEventType<T>,
> = xs.ExtractEvent<xs.EventFromLogic<T>, K>;

export type EventFromEmitted<
  T extends xs.AnyStateMachine,
  K extends ActorEventType<T>,
> = xs.ExtractEvent<xs.EmittedFrom<T>, K>;

/**
 * An inspector function for an actor
 */
export type InspectorFn = (evt: xs.InspectionEvent) => void;

/**
 * A logger function for an actor
 */
export type LoggerFn = (...args: any[]) => void;
