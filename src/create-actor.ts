import {
  type Actor,
  type ActorOptions,
  type AnyActorLogic,
  createActor,
  type InputFrom,
  type IsNotNever,
} from 'xstate';

export type RequiredOptions<TLogic extends AnyActorLogic> =
  undefined extends InputFrom<TLogic> ? never : 'input';

export type CreateActorOptions<TLogic extends AnyActorLogic> =
  IsNotNever<RequiredOptions<TLogic>> extends true
    ? {input: ActorOptions<TLogic>['input']} & ActorOptions<TLogic>
    : ActorOptions<TLogic>;

export type CurryCreateActorFromLogic = (() => CurryCreateActorFromLogic) &
  (<TLogic extends AnyActorLogic>(
    logic: TLogic,
    options: CreateActorOptions<TLogic>,
  ) => Actor<TLogic>) &
  (<TLogic extends AnyActorLogic>(
    logic: TLogic,
  ) => CurryCreateActorFromLogicP1<TLogic>);

export type CurryCreateActorFromLogicP1<TLogic extends AnyActorLogic> = ((
  options: CreateActorOptions<TLogic>,
) => Actor<TLogic>) &
  (() => CurryCreateActorFromLogicP1<TLogic>);

export type CurryCreateActorWith = (() => CurryCreateActorWith) &
  (<TLogic extends AnyActorLogic>(
    options: CreateActorOptions<TLogic>,
    logic: TLogic,
  ) => Actor<TLogic>) &
  (<TLogic extends AnyActorLogic>(
    options: CreateActorOptions<TLogic>,
  ) => CurryCreateActorWithP1<TLogic>);

export type CurryCreateActorWithP1<TLogic extends AnyActorLogic> = ((
  logic: TLogic,
) => Actor<TLogic>) &
  (() => CurryCreateActorWithP1<TLogic>);

export function createActorFromLogic(): typeof createActorFromLogic;

export function createActorFromLogic<TLogic extends AnyActorLogic>(
  logic: TLogic,
): CurryCreateActorFromLogicP1<TLogic>;

export function createActorFromLogic<TLogic extends AnyActorLogic>(
  logic: TLogic,
  options: CreateActorOptions<TLogic>,
): Actor<TLogic>;

export function createActorFromLogic<TLogic extends AnyActorLogic>(
  logic?: TLogic,
  options?: CreateActorOptions<TLogic>,
) {
  if (logic) {
    if (options) {
      return createActor(logic, options);
    }

    return ((options?: CreateActorOptions<TLogic>) => {
      return options
        ? createActorFromLogic(logic, options)
        : createActorFromLogic(logic);
    }) as CurryCreateActorFromLogicP1<TLogic>;
  }

  return createActorFromLogic;
}

export function createActorWith(): typeof createActorWith;

export function createActorWith<TLogic extends AnyActorLogic>(
  options: CreateActorOptions<TLogic>,
): CurryCreateActorWithP1<TLogic>;

export function createActorWith<TLogic extends AnyActorLogic>(
  options: CreateActorOptions<TLogic>,
  logic: TLogic,
): Actor<TLogic>;

export function createActorWith<TLogic extends AnyActorLogic>(
  options?: CreateActorOptions<TLogic>,
  logic?: TLogic,
) {
  if (options) {
    if (logic) {
      return createActor(logic, options);
    }

    return ((logic?: TLogic) => {
      return logic ? createActorWith(options, logic) : createActorWith(options);
    }) as CurryCreateActorWithP1<TLogic>;
  }

  return createActorWith;
}
