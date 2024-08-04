import type * as xs from 'xstate';

/**
 * Any event or emitted-event from an actor
 */
export type ActorEvent<T extends xs.AnyActorLogic> =
  | xs.EmittedFrom<T>
  | xs.EventFromLogic<T>;

/**
 * A tuple of events emitted by an actor, based on a {@link ActorEventTypeTuple}
 *
 * @see {@link ActorRunner.runUntilEvent}
 */
export type ActorEventTuple<
  T extends xs.AnyActorLogic,
  EventTypes extends ActorEventTypeTuple<T>,
> = {[K in keyof EventTypes]: EventFromEventType<T, EventTypes[K]>};

/**
 * The `type` prop of any event or emitted event from an actor
 */
export type ActorEventType<T extends xs.AnyActorLogic> = ActorEvent<T>['type'];

/**
 * A tuple of event types (event names) emitted by an actor
 *
 * @see {@link ActorRunner.runUntilEvent}
 */
export type ActorEventTypeTuple<T extends xs.AnyActorLogic> = [
  ActorEventType<T>,
  ...ActorEventType<T>,
];

/**
 * An inspector function for an actor
 */
export type InspectorFn = (evt: xs.InspectionEvent) => void;

/**
 * A logger function for an actor
 */
export type LoggerFn = (...args: any[]) => void;

/**
 * Options for methods in {@link ActorRunner}
 */
export type ActorRunnerOptions = {
  /**
   * Default actor ID to use
   */
  id?: string;

  /**
   * Default inspector to use
   *
   * @param An {@link xs.InspectionEvent InspectionEvent}
   */
  inspector?: InspectorFn;

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
} & ActorRunnerOptions;

/**
 * Options in {@link IActorRunner} methods where an existing {@link Actor} is
 * provided instead of input for a new `Actor`.
 *
 * These methods cannot and should not overwrite an existing actor's ID.
 */
export type ActorRunnerOptionsForActor = Omit<ActorRunnerOptions, 'id'>;

/**
 * Actor runner options _with_ an existing `Actor` and an optional `target`
 * `Actor`.
 */
export type ActorRunnerOptionsForActorWithTarget = {
  target?: string | xs.AnyActorRef;
} & ActorRunnerOptionsForActor;

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
> = xs.ExtractEvent<ActorEvent<T>, K>;

/**
 * Options for methods in {@link ActorRunner} which provide their own inspection
 * callbacks, and thus do allow custom inspectors.
 */
export type OptionsWithoutInspect<T extends ActorRunnerOptions> = Omit<
  T,
  'inspect'
>;

/**
 * The main interface for `xstate-audition`.
 *
 * Provides helper methods for running actors and making assertions about their
 * behavior.
 */
export interface IActorRunner<T extends xs.AnyActorLogic> {
  /**
   * Runs an actor to completion (or timeout) and fulfills with its output.
   *
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns `Promise` fulfilling with the actor output
   */
  runUntilDone:
    | ((
        input: xs.Actor<T>,
        options?: ActorRunnerOptionsForActor,
      ) => ActorThenable<T, MaybeOutputFromLogic<T>>)
    | ((
        input: xs.InputFrom<T>,
        options?: ActorRunnerOptions,
      ) => ActorThenable<T, MaybeOutputFromLogic<T>>);

  /**
   * Runs an actor (or starts a new one) until it emits or sends one or more
   * events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * Immediately stops the actor thereafter.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   */
  runUntilEvent<
    const EventTypes extends
      | ActorEventTypeTuple<T>
      | ActorEventTypeTuple<xs.AnyActorLogic>,
  >(
    events: EventTypes,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options?:
      | ActorRunnerOptionsForActorWithTarget
      | ActorRunnerOptionsWithTarget,
  ): ActorThenable<
    T,
    | ActorEventTuple<T, EventTypes>
    | ActorEventTuple<xs.AnyActorLogic, EventTypes>
  >;

  /**
   * Runs an actor until the snapshot predicate returns `true`.
   *
   * Immediately stops the actor thereafter.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  runUntilSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.Actor<T> | xs.InputFrom<T>,
  ): ActorThenable<T, xs.SnapshotFrom<T>>;

  /**
   * Waits for an actor to be spawned.
   *
   * "Actor" here refers to _some other actor_--not the actor provided via
   * `input` nor created from the input object (this is the "root" actor).
   *
   * Immediately stops the root actor thereafter.
   *
   * @param actorId A string or RegExp to match against the actor ID
   * @param input Actor input or an {@link xs.Actor}
   * @param options Options
   * @returns The `ActorRef` of the spawned actor
   */
  runUntilSpawn(
    actorId: RegExp | string,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options?: ActorRunnerOptions | ActorRunnerOptionsForActor,
  ): ActorThenable<T, xs.AnyActorRef>;

  /**
   * Starts an actor, applying defaults, and returns the {@link xs.Actor} object.
   *
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns The {@link xs.Actor} itself
   */
  start(input: xs.Actor<T> | xs.InputFrom<T>): xs.Actor<T>;

  /**
   * Runs an actor (or starts a new one) until it emits or sends one or more
   * events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   */
  waitForEvent<
    const EventTypes extends
      | ActorEventTypeTuple<T>
      | ActorEventTypeTuple<xs.AnyActorLogic>,
  >(
    events: EventTypes,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options?:
      | ActorRunnerOptionsForActorWithTarget
      | ActorRunnerOptionsWithTarget,
  ): ActorThenable<
    T,
    | ActorEventTuple<T, EventTypes>
    | ActorEventTuple<xs.AnyActorLogic, EventTypes>
  >;

  /**
   * Runs a new or existing actor until the snapshot predicate returns `true`.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  waitForSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.Actor<T> | xs.InputFrom<T>,
  ): ActorThenable<T, xs.SnapshotFrom<T>>;

  /**
   * Waits for an actor to be spawned.
   *
   * "Actor" here refers to _some other actor_--not the actor provided via
   * `input` nor created from the input object.
   *
   * Does **not** stop the root actor.
   *
   * @param actorId A string or RegExp to match against the actor ID
   * @param input Actor input or an {@link xs.Actor}
   * @param options Options
   * @returns The `ActorRef` of the spawned actor
   */
  waitForSpawn(
    actorId: RegExp | string,
    input: xs.Actor<T> | xs.InputFrom<T>,
  ): ActorThenable<T, xs.AnyActorRef>;
}

/**
 * An {@link IActorRunner} which provides additional methods for testing state
 * machines
 */
export interface IStateMachineActorRunner<T extends xs.AnyStateMachine>
  extends IActorRunner<T> {
  /**
   * Runs the machine until a transition from the `source` state to the `target`
   * state occurs.
   *
   * Immediately stops the machine thereafter. Returns a combination of a
   * `Promise` and an {@link xs.Actor} so that events may be sent to the actor.
   *
   * @param source Source state ID
   * @param target Target state ID
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param opts Options
   * @returns An {@link ActorThenable} that resolves when the specified
   *   transition occurs
   * @todo Type narrowing for `source` and `target` once xstate supports it
   */
  runUntilTransition(
    source: string,
    target: string,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options?: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsForActor
    >,
  ): ActorThenable<T>;

  /**
   * Runs the machine until a transition from the `source` state to the `target`
   * state occurs.
   *
   * Useful for chaining transitions--but keep in mind that actions are executed
   * synchronously!
   *
   * **Does not stop the machine**. Returns a combination of a `Promise` and an
   * {@link xs.Actor} so that events may be sent to the actor.
   *
   * @param source Source state ID
   * @param target Target state ID
   * @param input Machine input
   * @param opts Options
   * @returns An {@link ActorThenable} that resolves when the specified
   *   transition occurs
   * @todo Type narrowing for `source` and `target` once xstate supports it
   */
  waitForTransition(
    source: string,
    target: string,
    input: xs.Actor<T> | xs.InputFrom<T>,
    options?: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsForActor
    >,
  ): ActorThenable<T>;
}

/**
 * Object containing everything you need to abort a `Promise`!
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
   * The `rssolve` function of `promise`
   *
   * @param value Whatever `promise` should resolve with
   */
  resolve: (value: PromiseLike<T> | T) => void;
};

export type MaybeOutputFromLogic<T extends xs.AnyActorLogic> =
  T extends xs.ActorLogic<
    infer TSnapshot,
    infer _TEvent,
    infer _TInput,
    infer _TSystem,
    infer _TEmitted
  >
    ? ({
        status: 'done';
      } & TSnapshot)['output']
    : undefined;

export type MaybeSnapshotFromLogic<T extends xs.AnyActorLogic> =
  T extends xs.ActorLogic<
    infer TSnapshot,
    infer _TEvent,
    infer _TInput,
    infer _TSystem,
    infer _TEmitted
  >
    ? TSnapshot
    : undefined;
