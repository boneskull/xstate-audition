# xstate-audition

> Harnesses for testing XState v5 Actors. Actor test...audition...get it??

**xstate-audition** is a library for testing the behavior of [XState Actors][]. All actor types are supported, including:

- State Machines (Statecharts)
- Promise Actors
- Callback Actors
- Transition Actors
- Observable Actors

- [Usage](#usage)
  - [`runUntilEmitted()`](#rununtilemitted)
  - [`runUntilTransition()`](#rununtiltransition)
  - [`runUntilDone()`](#rununtildone)
  - [`runUntilSnapshot()`](#rununtilsnapshot)
  - [`runUntilSpawn()`](#rununtilspawn)
  - [`runUntilEventReceived()`](#rununtileventreceived)
  - [`runUntilEventSent()`](#rununtileventsent)
- [Requirements](#requirements)
- [Installation](#installation)
- [API Notes](#api-notes)
  - [`AuditionOptions`](#auditionoptions)
- [License](#license)

## Usage

TL;DR:

1. Create an `Actor` using `xstate.createActor(logic)`.
2. Create a `Promise<T>` using one of the functions below (e.g., `runUntilDone(actor)`). `runUntilDone()` resolves with the _Actor output_ (`T`), but other functions resolve with other `T`'s. If the actor hadn't yet been started, it will be started now.
3. _If_ your actor needs external input to resolve the condition (e.g., it must receive an event), perform that operation, _before_ you `await` the `Promise<T>`.
4. Now, you can `await` the `Promise<T>` from step 2.
5. Finally, make an assertion about `T`.

### `runUntilEmitted()`

> Run a State Machine Until It Emits Events

`runUntilEmitted(actor, eventTypes)` / `runUntilEmittedWith(actor, options, eventTypes)` are curried function that will start an actor and run it until emits one or more events of the specified `type`. Once the events have been emitted, the actor will immediately be stopped.

`waitForEmitted(actor, eventTypes)` / `waitForEmittedWith(actor, options, eventTypes)` are similar, but do not stop the actor.

```ts
import {strict as assert} from 'node:assert';
import {beforeEach, describe, it} from 'node:test';
import {type Actor, createActor, emit, setup} from 'xstate';
import {type CurryEmittedP1, runUntilEmitted} from 'xstate-audition';

describe('runUntilEmitted()', () => {
  type Emit1 = {type: 'EMIT1'; value: string};

  type Emit2 = {type: 'EMIT2'; value: number};

  type EmitterEmitted = Emit1 | Emit2;

  const emitterMachine = setup({
    types: {
      emitted: {} as EmitterEmitted,
    },
  }).createMachine({
    initial: 'emitting',
    states: {
      done: {
        type: 'final',
      },
      emitting: {
        after: {
          50: {
            actions: [
              emit({type: 'EMIT1', value: 'value'}),
              emit({type: 'EMIT2', value: 42}),
            ],
            target: 'waitMore',
          },
        },
      },
      waitMore: {
        after: {
          50: 'done',
        },
      },
    },
  });

  let actor: Actor<typeof emitterMachine>;

  let runUntilEmit: CurryEmittedP1<typeof actor>;

  beforeEach(() => {
    actor = createActor(emitterMachine);

    // runUntilEmitted is curried, so could be called with [actor, ['EMIT1', 'EMIT2']]
    // instead
    runUntilEmit = runUntilEmitted(actor);
  });

  it('should emit events', async () => {
    const [emit1Event, emit2Event] = await runUntilEmit(['EMIT1', 'EMIT2']);

    assert.deepEqual(emit1Event, {type: 'EMIT1', value: 'value'});
    assert.deepEqual(emit2Event, {type: 'EMIT2', value: 42});
  });

  it('should halt the actor', async () => {
    await runUntilEmit(['EMIT1', 'EMIT2']);

    assert.strictEqual(actor.getSnapshot().status, 'stopped');
  });
});
```

### `runUntilTransition()`

> Run a State Machine Until It Transitions from One State to Another

`runUntilTransition(actor, fromStateId, toStateId)` / `runUntilTransitionWith(actor, options, fromStateId, toStateId)` are curried functions that will start an actor and run it until it transitions from state with ID `fromStateId` to state with ID `toStateId`. Once the actor transitions to the specified state, it will immediately be stopped.

`waitForTransition(actor, fromStateId, toStateId)` / `waitForStateWith(actor, options, fromStateId, toStateId)` are similar, but do not stop the actor.

```ts
// TODO
```

### `runUntilDone()`

> Run a Promise Actor or State Machine to Completion

`runUntilDone(actor)` / `runUntilDoneWith(actor, options)` are curried functions that will start a [Promise Actor][] or [State Machine Actor][] and run it until it reaches a final state. Once the actor reaches a final state, it will immediately be stopped. The `Promise` will be resolved with the output of the actor.

> [!NOTE]
>
> - `runUntilDone()` is not significantly different than XState's `toPromise()`.
> - `runUntilDoneWith()` may be used to overwrite the internal logger and/or add an inspector callback (or `Observer`) to an actor.
> - _There is no such_ `waitForDone(...)` / `waitForDoneWith(...)` variant, since that would be silly.

```ts
// TODO
```

### `runUntilSnapshot()`

> Run a Actor Until It Satisfies a Snapshot Predicate

`runUntilSnapshot(actor, predicate)` / `runUntilSnapshotWith(actor, options,  predicate)` are curried functions that will start an actor and run it until the actor's [Snapshot][snapshot] satisfies `predicate` (which is the same type as the `predicate` parameter of [`xstate.waitFor()`][waitFor]). Once the snapshot matches the predicate, the actor will immediately be stopped.

> [!NOTE]
>
> - Like [`runUntilDone()`][runUntilDone], `runUntilSnapshot()` is not significantly different than XState's `waitFor()`.
> - `runUntilSnapshotWith()` may be used to overwrite the internal logger and/or add an inspector callback (or `Observer`) to an Actor.

### `runUntilSpawn()`

> Run a State Machine Actor Until It Spawns a Child Actor

`runUntilSpawn(actor, childId)` / `runUntilSpawnWith(actor, options, childId)` are curried functions that will start an actor and run it until it spawns a child actor with `id` matching `childId` (which may be a `RegExp`). Once the child actor is spawned, the actor will immediately be stopped. The `Promise` will be resolved with a reference to the spawned actor (an `xstate.AnyActorRef`).

The spawned actor will also be stopped.

`waitForSpawn(actor, childId)` / `waitForSpawnWith(actor, options, childId)` are similar, but do not stop the actor.

```ts
// TODO
```

### `runUntilEventReceived()`

> Run an Actor Until It Receives an Event

`runUntilEventReceived(actor, eventTypes)` / `runUntilEventReceivedWith(actor, options, eventTypes)` are curried functions that will start a [State Machine Actor][], [Callback Actor][], or [Transition Actor][] and run it until it receives event(s) of the specified `type`. Once the event(s) are received, the actor will immediately be stopped. The `Promise` will be resolved with the received event(s).

`runUntilEventReceived()`'s `options` parameter accepts an `otherActorId` (`string` or `RegExp`) property. If set, this will ensure the event was _received from_ the actor with ID matching `otherActorId`.

`withForEventReceived(actor, eventTypes)` / `waitForEventReceivedWith(actor, options, eventTypes)` are similar, but do not stop the actor.

```ts
// TODO
```

### `runUntilEventSent()`

> Run an Actor Until It Sends an Event

`runUntilEventSent(actor, eventTypes)` / `runUntilEventSentWith(actor, options, eventTypes)` are curried functions that will start an Actor and run it until it sends event(s) of the specified `type`. Once the event(s) are sent, the actor will immediately be stopped. The `Promise` will be resolved with the sent event(s).

`runUntilEventSentWith()`'s `options` parameter accepts an `otherActorId` (`string` or `RegExp`) property. If set, this will ensure the event was _sent to_ the actor with ID matching `otherActorId`.

`waitForEventSent(actor, eventTypes)` / `waitForEventSentWith(actor, options, eventTypes)` are similar, but do not stop the actor.

```ts
// TODO
```

## Requirements

- Node.js v20.0.0+ or modern browser
- `xstate` v5.17.1+ (peer dependency)

## Installation

```sh
npm install xstate-audition xstate -D
```

## API Notes

> [!IMPORTANT]
>
> - The functions exposed by **xstate-audition**'s are _all curried_. The ultimate return type of each function is a `Promise<T>`.
> - Any inspectors _already attached_ to an `Actor` provided to **xstate-audition** will be preserved.
> - At this time, **xstate-audition** offers no mechanism to set global defaults for [`AuditionOptions`][AuditionOptions].

### `AuditionOptions`

If you want to attach your own inspector, use a different logger, or set a different timeout, you can use `AuditionOptions`.

All functions ending in `With()` accept an `AuditionOptions` object as the _second_ argument. **If the function name doesn't end with `With()`, it does not accept an `AuditionOptions` object.** This object may contain the following properties:

- **`inspector`** - `((event: xstate.InspectionEvent) => void) | xstate.Observer<xstate.InspectionEvent>`: An inspector callback or observer to attach to the actor. This _will not_ overwrite any existing inspector.

  The behavior is similar to setting the `inspect` option when calling `xstate.createActor()`.

- **`logger`** - `(args: ...any[]) => void`: **Default: no-op** (no logging; XState defaults to `console.log`). Set the logger of the Actor.

  The behavior is similar to setting the `logger` option when calling `xstate.createActor()`; _however_, this logger ~~will~~ should cascade to all child actors.

- **`timeout`** - `number`: **Default: 1000ms**. The maximum number of milliseconds to wait for the actor to satisfy the condition. If the actor does not satisfy the condition within this time, the `Promise` will be rejected.

  A `timeout` of `0`, a negative number, or `Infinity` will disable the timeout.

  _The value of `timeout` should be less than the test timeout!_

## License

©️ 2024 [Christopher "boneskull" Hiller][boneskull]. Licensed Apache-2.0.

[promise actor]: https://stately.ai/docs/actors#frompromise
[state machine actor]: https://stately.ai/docs/actors#createmachine
[callback actor]: https://stately.ai/docs/actors#fromcallback
[transition actor]: https://stately.ai/docs/actors#fromtransition
[waitFor]: https://stately.ai/blog/2022-05-03-whats-new-may-2022#waitfor
[XState actors]: https://stately.ai/docs/category/actors
[snapshot]: https://stately.ai/docs/actors#actor-snapshots
[AuditionOptions]: #auditionoptions
[runUntilDone]: #rununtildone
[boneskull]: https://github.com/boneskull
