import * as xs from 'xstate';

/**
 * Required input values for `TLogic`.
 *
 * @template TLogic Actor logic type
 * @see {@link CreateActorOptions}
 */
export type RequiredOptions<TLogic extends xs.AnyActorLogic> =
  undefined extends xs.InputFrom<TLogic> ? never : 'input';

/**
 * Options for creating an actor from actor logic.
 *
 * @see {@link createActorFromLogic}
 * @see {@link createActorWith}
 */
export type CreateActorOptions<TLogic extends xs.AnyActorLogic> =
  xs.IsNotNever<RequiredOptions<TLogic>> extends true
    ? xs.ActorOptions<TLogic> & {input: xs.ActorOptions<TLogic>['input']}
    : xs.ActorOptions<TLogic>;

/**
 * A function which returns {@link CurryCreateActorFromLogic}
 */
export type CurryCreateActorFromLogicFnIdentity = <
  TLogic extends xs.AnyActorLogic,
>() => CurryCreateActorFromLogic<TLogic>;

/**
 * A function which accepts actor logic and returns a
 * {@link CurryCreateActorFromLogicFnUsingLogic}
 */
export type CurryCreateActorFromLogicFnWithLogic<
  TLogic extends xs.AnyActorLogic,
> = (logic: TLogic) => CurryCreateActorFromLogicFnUsingLogic<TLogic>;

/**
 * A function which accepts actor logic and options and returns an
 * {@link xs.Actor}.
 */
export type CurryCreateActorFromLogicFnWithLogicAndOptions<
  TLogic extends xs.AnyActorLogic,
> = (logic: TLogic, options: CreateActorOptions<TLogic>) => xs.Actor<TLogic>;

/**
 * The type of {@link curryCreateActorFromLogic}
 */
export type CurryCreateActorFromLogic<TLogic extends xs.AnyActorLogic> =
  CurryCreateActorFromLogicFnIdentity &
    CurryCreateActorFromLogicFnWithLogic<TLogic> &
    CurryCreateActorFromLogicFnWithLogicAndOptions<TLogic>;

export type CurryCreateActorFromLogicFnUsingLogicIdentity<
  TLogic extends xs.AnyActorLogic,
> = () => CurryCreateActorFromLogicFnUsingLogic<TLogic>;

export type CurryCreateActorFromLogicUsingLogicWithOptions<
  TLogic extends xs.AnyActorLogic,
> = (options: CreateActorOptions<TLogic>) => xs.Actor<TLogic>;

export type CurryCreateActorFromLogicFnUsingLogic<
  TLogic extends xs.AnyActorLogic,
> = CurryCreateActorFromLogicFnUsingLogicIdentity<TLogic> &
  CurryCreateActorFromLogicUsingLogicWithOptions<TLogic>;

export type CurryCreateActorWith = (() => CurryCreateActorWith) &
  (<TLogic extends xs.AnyActorLogic>(
    options: CreateActorOptions<TLogic>,
  ) => CurryCreateActorWithP1<TLogic>) &
  (<TLogic extends xs.AnyActorLogic>(
    options: CreateActorOptions<TLogic>,
    logic: TLogic,
  ) => xs.Actor<TLogic>);

// prettier-ignore
export type CurryCreateActorWithP1<TLogic extends xs.AnyActorLogic> =
  ((logic: TLogic) => xs.Actor<TLogic>) &
    (() => CurryCreateActorWithP1<TLogic>);

/**
 * Returns itself
 */
export function createActorFromLogic(): typeof createActorFromLogic;

/**
 * Returns a function which accepts {@link CreateActorOptions} and returns a
 * function which accepts actor logic, then creates an `Actor`.
 *
 * @template TLogic Actor logic type
 * @param logic Actor logic
 */
export function createActorFromLogic<TLogic extends xs.AnyActorLogic>(
  logic: TLogic,
): CurryCreateActorFromLogicFnUsingLogic<TLogic>;

/**
 * Creates an actor from actor logic and options.
 *
 * @template TLogic Actor logic type
 * @param logic Actor logic
 * @param options Options
 */
export function createActorFromLogic<TLogic extends xs.AnyActorLogic>(
  logic: TLogic,
  options: CreateActorOptions<TLogic>,
): xs.Actor<TLogic>;

export function createActorFromLogic<TLogic extends xs.AnyActorLogic>(
  logic?: TLogic,
  options?: CreateActorOptions<TLogic>,
) {
  if (logic) {
    if (options) {
      return xs.createActor(logic, options);
    }

    return ((options?: CreateActorOptions<TLogic>) => {
      return options
        ? createActorFromLogic(logic, options)
        : createActorFromLogic(logic);
    }) as CurryCreateActorFromLogicFnUsingLogic<TLogic>;
  }

  return createActorFromLogic;
}

export function createActorWith(): typeof createActorWith;

export function createActorWith<TLogic extends xs.AnyActorLogic>(
  options: CreateActorOptions<TLogic>,
): CurryCreateActorWithP1<TLogic>;

export function createActorWith<TLogic extends xs.AnyActorLogic>(
  options: CreateActorOptions<TLogic>,
  logic: TLogic,
): xs.Actor<TLogic>;

export function createActorWith<TLogic extends xs.AnyActorLogic>(
  options?: CreateActorOptions<TLogic>,
  logic?: TLogic,
) {
  if (options) {
    if (logic) {
      return xs.createActor(logic, options);
    }

    return ((logic?: TLogic) => {
      return logic ? createActorWith(options, logic) : createActorWith(options);
    }) as CurryCreateActorWithP1<TLogic>;
  }

  return createActorWith;
}
