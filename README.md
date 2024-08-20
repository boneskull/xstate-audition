# xstate-audition

> Harnesses for testing XState v5 Actors. Actor test...audition...get it??

**xstate-audition** is a _dependency-free_ library for testing the behavior of [XState Actors][].

- [Usage](#usage)
  - [`runUntilEmitted()`](#rununtilemitted)
  - [`runUntilTransition()`](#rununtiltransition)
  - [`runUntilDone()`](#rununtildone)
  - [`runUntilSnapshot()`](#rununtilsnapshot)
  - [`runUntilSpawn()`](#rununtilspawn)
  - [`runUntilEventReceived()`](#rununtileventreceived)
  - [`runUntilEventSent()`](#rununtileventsent)
  - [`createActorFromLogic(logic, options)`](#createactorfromlogiclogic-options)
  - [`createActorWith(options, logic)`](#createactorwithoptions-logic)
  - [`unpatchActor()`](#unpatchactor)
- [Requirements](#requirements)
- [Installation](#installation)
- [API Notes](#api-notes)
  - [`AuditionOptions`](#auditionoptions)
- [License](#license)
- [Disclaimer](#disclaimer)

## Usage

**TL;DR:**

1. Create an `Actor` using `xstate.createActor(logic)`.
2. Create a `Promise<T>` using one of the functions below (e.g., `runUntilDone(actor: Actor) => Promise<T>` where `T` is the _Actor output_). If the actor hadn't yet been started, it will be started now.
3. _If_ your actor needs external input to resolve the condition (e.g., it must receive an event), perform that operation _before_ you `await` the `Promise<T>` (examples below).
4. Now, you can `await` the `Promise<T>` from step 2.
5. Finally, make an assertion about `T`.

### `runUntilEmitted()`

> Run a State Machine Until It Emits Events

`runUntilEmitted(actorRef, eventTypes)` / `runUntilEmittedWith(actorRef, options, eventTypes)` are curried function that will start an actor and run it until emits one or more events of the specified `type`. Once the events have been emitted, the actor will immediately be stopped.

`waitForEmitted(actorRef, eventTypes)` / `waitForEmittedWith(actorRef, options, eventTypes)` are similar, but do not stop the actor.

> [!NOTE]
>
> This function _only_ applies to events emitted via the [event emitter API][event-emitter].

```ts
import {strict as assert} from 'node:assert';
import {beforeEach, describe, it} from 'node:test';
import {type Actor, createActor, emit, setup} from 'xstate';

import {type CurryEmittedP1, runUntilEmitted} from 'xstate-audition';

type Emit1 = {type: 'EMIT1'; value: string};

type Emit2 = {type: 'EMIT2'; value: number};

type EmitterEmitted = Emit1 | Emit2;

const emitterMachine = setup({
  types: {
    emitted: {} as EmitterEmitted,
  },
}).createMachine({
  entry: [
    emit({type: 'EMIT1', value: 'value'}),
    emit({type: 'EMIT2', value: 42}),
  ],
});

describe('emitterMachine', () => {
  let actor: Actor<typeof emitterMachine>;

  let runUntilEmit: CurryEmittedP1<typeof actor>;

  beforeEach(() => {
    actor = createActor(emitterMachine);

    // runUntilEmitted is curried, so could be called with [actor, ['EMIT1', 'EMIT2']]
    // instead
    runUntilEmit = runUntilEmitted(actor);
  });

  it('should emit two events', async () => {
    const [emit1Event, emit2Event] = await runUntilEmit(['EMIT1', 'EMIT2']);

    assert.deepEqual(emit1Event, {type: 'EMIT1', value: 'value'});
    assert.deepEqual(emit2Event, {type: 'EMIT2', value: 42});
  });
});
```

### `runUntilTransition()`

> Run a State Machine Until It Transitions from One State to Another

`runUntilTransition(actorRef, fromStateId, toStateId)` / `runUntilTransitionWith(actorRef, options, fromStateId, toStateId)` are curried functions that will start an actor and run it until it transitions from state with ID `fromStateId` to state with ID `toStateId`. Once the actor transitions to the specified state, it will immediately be stopped.

`waitForTransition(actorRef, fromStateId, toStateId)` / `waitForStateWith(actorRef, options, fromStateId, toStateId)` are similar, but do not stop the actor.

```ts
import {strict as assert} from 'node:assert';
import {beforeEach, describe, it} from 'node:test';
import {type Actor, createActor, createMachine} from 'xstate';

import {type CurryTransitionP2, runUntilTransition} from '../src/index.js';

const transitionMachine = createMachine({
  // if you do not supply a default ID, then the ID will be `(machine)`
  id: 'transitionMachine',
  initial: 'first',
  states: {
    first: {
      after: {
        100: 'second',
      },
    },
    second: {
      after: {
        100: 'third',
      },
    },
    third: {
      type: 'final',
    },
  },
});

describe('transitionMachine', () => {
  let actor: Actor<typeof transitionMachine>;

  let runWithFirst: CurryTransitionP2<typeof actor>;

  beforeEach(() => {
    actor = createActor(transitionMachine);
    // curried
    runWithFirst = runUntilTransition(actorRef, 'transitionMachine.first');
  });

  it('should transition from "first" to "second"', async () => {
    await runWithFirst('transitionMachine.second');
  });

  it('should not transition from "first" to "third"', async () => {
    await assert.rejects(runWithFirst('transitionMachine.third'));
  });
});
```

### `runUntilDone()`

> Run a Promise Actor or State Machine to Completion

`runUntilDone(actor)` / `runUntilDoneWith(actorRef, options)` are curried functions that will start a [Promise Actor][] or [State Machine Actor][] and run it until it reaches a final state. Once the actor reaches a final state, it will immediately be stopped. The `Promise` will be resolved with the output of the actor.

> [!NOTE]
>
> - `runUntilDone()` is not significantly different than XState's `toPromise()`.
> - `runUntilDoneWith()` may be used to overwrite the internal logger and/or add an inspector callback (or `Observer`) to an actor.
> - _There is no such_ `waitForDone(...)` / `waitForDoneWith(...)` variant, since that would be silly.

```ts
import {strict as assert} from 'node:assert';
import {beforeEach, describe, it} from 'node:test';
import {type Actor, createActor, fromPromise} from 'xstate';

import {runUntilDone, runUntilDoneWith} from 'xstate-audition';

const promiseLogic = fromPromise<string, string>(
  // this signal is aborted via call to Actor.stop()
  async ({input, signal}) => {
    let listener!: () => void;
    try {
      return await new Promise((resolve, reject) => {
        listener = () => {
          clearTimeout(timeout);
          // this rejection is eaten by xstate-audition
          // in lieu of its own timeout error (seen below)
          reject(signal.reason);
        };

        const timeout = setTimeout(() => {
          resolve(`hello ${input}`);
        }, 500);

        signal.addEventListener('abort', listener);
      });
    } finally {
      signal.removeEventListener('abort', listener);
    }
  },
);

describe('logic', () => {
  let actor: Actor<typeof promiseLogic>;

  beforeEach(() => {
    actor = createActor(promiseLogic, {input: 'world'});
  });

  it('should output with the expected value', async () => {
    const result = await runUntilDone(actor);

    assert.equal(result, 'hello world');
  });

  it('should abort when provided a too-short timeout', async () => {
    await assert.rejects(
      runUntilDoneWith(actorRef, {timeout: 100}),
      (err: Error) => {
        assert.equal(err.message, 'Actor did not complete in 100ms');

        return true;
      },
    );
  });
});
```

### `runUntilSnapshot()`

> Run a Actor Until It Satisfies a Snapshot Predicate

`runUntilSnapshot(actorRef, predicate)` / `runUntilSnapshotWith(actorRef, options,  predicate)` are curried functions that will start an actor and run it until the actor's [Snapshot][snapshot] satisfies `predicate` (which is the same type as the `predicate` parameter of [`xstate.waitFor()`][waitFor]). Once the snapshot matches the predicate, the actor will immediately be stopped.

> [!NOTE]
>
> - Like [`runUntilDone()`][runUntilDone], `runUntilSnapshot()` is not significantly different than XState's `waitFor()`.
> - `runUntilSnapshotWith()` may be used to overwrite the internal logger and/or add an inspector callback (or `Observer`) to an Actor.

```ts
import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';
import {assign, createActor, setup} from 'xstate';

import {runUntilSnapshot} from 'xstate-audition';

const snapshotLogic = setup({
  types: {
    context: {} as {word?: string},
  },
}).createMachine({
  initial: 'first',
  states: {
    done: {
      type: 'final',
    },
    first: {
      after: {
        50: 'second',
      },
      entry: assign({
        word: 'foo',
      }),
    },
    second: {
      after: {
        50: 'third',
      },
      entry: assign({
        word: 'bar',
      }),
    },
    third: {
      after: {
        50: 'done',
      },
      entry: assign({
        word: 'baz',
      }),
    },
  },
});

describe('snapshotLogic', () => {
  it('should contain word "bar" in state "second"', async () => {
    const actor = createActor(snapshotLogic);

    const snapshot = await runUntilSnapshot(actorRef, (snapshot) =>
      snapshot.matches('second'),
    );

    assert.deepEqual(snapshot.context, {word: 'bar'});
  });

  it('should be in state "second" when word is "bar"', async () => {
    const actor = createActor(snapshotLogic);

    const snapshot = await runUntilSnapshot(
      actor,
      (snapshot) => snapshot.context.word === 'bar',
    );

    assert.equal(snapshot.value, 'second');
  });
});
```

### `runUntilSpawn()`

> Run a State Machine Actor Until Its System Spawns a Child Actor

`runUntilSpawn(actorRef, childId)` / `runUntilSpawnWith(actorRef, options, childId)` are curried functions that will start an actor and run it until it spawns a child actor with `id` matching `childId` (which may be a `RegExp`). Once the child actor is spawned, the actor will immediately be stopped. The `Promise` will be resolved with a reference to the spawned actor (an `xstate.ActorRef`).

`waitForSpawn(actorRef, childId)` / `waitForSpawnWith(actorRef, options, childId)` are similar, but do not stop the actor.

The root State Machine Actor itself needn't spawn the child with the matching `id`, but _any_ actor within the root actor's system may spawn the child. As of this writing, there is no way to specify the _parent_ of the spawned actor.

> [!NOTE]
>
> The _type_ of the spawned actor cannot be inferred by ID alone. For this reason, it's recommended to _provide an explicit type argument_ declaring the type of the spawned actor's `ActorLogic`, as seen in the below example.

```ts
import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';
import {createActor, fromPromise, setup, spawnChild} from 'xstate';

import {waitForSpawn} from 'xstate-audition';

const noopPromiseLogic = fromPromise<void, void>(async () => {});

const spawnerMachine = setup({
  actors: {noop: noopPromiseLogic},
  types: {events: {} as {type: 'SPAWN'}},
}).createMachine({
  on: {
    SPAWN: {
      actions: spawnChild('noop', {id: 'noopPromise'}),
    },
  },
});

describe('spawnerMachine', () => {
  it('should spawn a child with ID "noopPromise" when "SPAWN" event received', async () => {
    const actor = createActor(spawnerMachine);

    try {
      // spawnerMachine needs an event to spawn the actor. but at this point,
      // the actor hasn't started, so we cannot send the event because nothing
      // will be listening for it.
      //
      // but if we start the actor ourselves & send the event, spawning could
      // happen before waitForSpawn can detect it! so instead of immediately
      // awaiting, let's just set it up first.
      const promise = waitForSpawn<typeof noopPromiseLogic>(
        actor,
        'noopPromise',
      );

      // the detection is now setup and the actor is active; the code running in
      // the Promise is waiting for the spawn to occur. so let's oblige it:
      actor.send({type: 'SPAWN'});

      // ...then we can finally await the promise.
      const actorRef = await promise;

      assert.equal(actorRef.id, 'noopPromise');
    } finally {
      // you can shutdown manually! for fun!
      actor.stop();
    }
  });
});
```

### `runUntilEventReceived()`

> Run an Actor Until It Receives an Event

`runUntilEventReceived(actorRef, eventTypes)` / `runUntilEventReceivedWith(actorRef, options, eventTypes)` are curried functions that will start a [State Machine Actor][], [Callback Actor][], or [Transition Actor][] and run it until it receives event(s) of the specified `type`. Once the event(s) are received, the actor will immediately be stopped. The `Promise` will be resolved with the received event(s).

`runUntilEventReceived()`'s `options` parameter accepts an `otherActorId` (`string` or `RegExp`) property. If set, this will ensure the event was _received from_ the actor with ID matching `otherActorId`.

`withForEventReceived(actorRef, eventTypes)` / `waitForEventReceivedWith(actorRef, options, eventTypes)` are similar, but do not stop the actor.

Usage is similar to [`runUntilEmitted()`](#rununtilemitted)—with the exception of the `otherActorId` property as described above.

### `runUntilEventSent()`

> Run an Actor Until It Sends an Event

`runUntilEventSent(actorRef, eventTypes)` / `runUntilEventSentWith(actorRef, options, eventTypes)` are curried functions that will start an Actor and run it until it sends event(s) of the specified `type`. Once the event(s) are sent, the actor will immediately be stopped. The `Promise` will be resolved with the sent event(s).

`runUntilEventSentWith()`'s `options` parameter accepts an `otherActorId` (`string` or `RegExp`) property. If set, this will ensure the event was _sent to_ the actor with ID matching `otherActorId`.

`waitForEventSent(actorRef, eventTypes)` / `waitForEventSentWith(actorRef, options, eventTypes)` are similar, but do not stop the actor.

Usage is similar to [`runUntilEmitted()`](#rununtilemitted)—with the exception of the `otherActorId` property as described above.

### `createActorFromLogic(logic, options)`

> Curried Function to Create an Actor from Logic

If you find yourself creating actors repeatedly with different options, try this function. Example:

```ts
const createActor = createActorFromLogic(myLogic);

it('should do x with input y', () => {
  const actorRef = createActor({input: 'y'});
  // ...
});

it('should do x2 with input z', () => {
  const actorRef = createActor({input: 'z'});
  // ...
});
```

See also [`createActorWith()`](#createactorwithoptions-logic).

### `createActorWith(options, logic)`

> Curried Function to Create an Actor with Options

If you find yourself using the same _options_ to repeatedly create different actors, try this function. Example:

```ts
const createYActor = createActorWith({input: 'y'}});

it('should do x with FooMachine', () => {
  const actorRef = createYActor(fooMachine);
  // ...
});

it('should do x2 with BarMachine', () => {
  const actorRef = createYActor(barMachine);
  // ...
});
```

See also [`createActorFromLogic()`](#createactorfromlogiclogic-options).

### `unpatchActor()`

> Revert Modifications Made to an Actor by **xstate-audition**

> [!WARNING]
>
> _This function is experimental and may be removed in a future release._

`unpatchActor(actorRef)` will "undo" what **xstate-inspector** did (e.g., unsubscribe its inspector and reset the logger), you can call this function with the `ActorRef`.

If **xstate-audition** has never touched the `ActorRef`, this function is a no-nop.

## Requirements

- Node.js v20.0.0+ or modern browser
- `xstate` v5.17.1+ (peer dependency)

> [!CAUTION]
>
> Haven't tested the browser yet!

## Installation

```sh
npm install xstate-audition xstate -D
```

## API Notes

> [!IMPORTANT]
>
> - All functions exposed by **xstate-audition**'s are curried. The final return type of each function is `Promise<T>`.
> - All functions ending in `With()` accept an [`AuditionOptions`](#auditionoptions) object as the _second_ argument. **If the function name doesn't end with `With()`, it does not accept an `AuditionOptions` object.**
> - Any inspectors _already attached_ to an `Actor` provided to **xstate-audition** will be preserved.
> - At this time, **xstate-audition** offers no mechanism to set global defaults for [`AuditionOptions`][AuditionOptions].

### `AuditionOptions`

If you want to attach your own inspector, use a different logger, or set a different timeout, you can use `AuditionOptions`.

It bears repeating: all functions ending in `With()` accept an `AuditionOptions` object as the _second_ argument. **If the function name doesn't end with `With()`, it does not accept an `AuditionOptions` object.**

The `AuditionOptions` object may contain the following properties:

- **`inspector`** - `((event: xstate.InspectionEvent) => void) | xstate.Observer<xstate.InspectionEvent>`: An inspector callback or observer to attach to the actor. This _will not_ overwrite any existing inspector, but may be "merged" with any inspector used internally by **xstate-audition**.

  The behavior is similar to setting the `inspect` option when calling `xstate.createActor()`.

- **`logger`** - `(args: ...any[]) => void`: **Default: no-op** (no logging; XState defaults to `console.log`). Set the logger of the Actor.

  The behavior is similar to setting the `logger` option when calling `xstate.createActor()`; _however_, this logger ~~will~~ should cascade to all child actors.

- **`timeout`** - `number`: **Default: 1000ms**. The maximum number of milliseconds to wait for the actor to satisfy the condition. If the actor does not satisfy the condition within this time, the `Promise` will be rejected.

  A `timeout` of `0`, a negative number, or `Infinity` will disable the timeout.

  _The value of `timeout` should be less than the test timeout!_

## License

©️ 2024 [Christopher "boneskull" Hiller][boneskull]. Licensed Apache-2.0.

## Disclaimer

_This project is not affiliated with nor endorsed by [Stately.ai](https://stately.ai)._

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
[event-emitter]: https://stately.ai/docs/event-emitter
