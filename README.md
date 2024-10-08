# xstate-audition

> Harnesses for testing XState v5 Actors. Actor test...audition...get it??

**xstate-audition** is a _dependency-free_ library for testing the behavior of [XState Actors][].

[**API Documentation**](https://boneskull.github.io/xstate-audition) |
[**GitHub**](https://github.com/boneskull/xstate-audition) |
[**npm**](https://npm.im/xstate-audition)

---

- [Usage \& Examples](#usage--examples)
  - [`runUntilDone(actor)`](#rununtildoneactor)
  - [`runUntilEmitted(actor, emittedTypes)`](#rununtilemittedactor-emittedtypes)
  - [`runUntilTransition(actor, fromStateId, toStateId)`](#rununtiltransitionactor-fromstateid-tostateid)
  - [`runUntilSnapshot(actor, predicate)`](#rununtilsnapshotactor-predicate)
  - [`runUntilSpawn(actor, childId)`](#rununtilspawnactor-childid)
  - [`runUntilEventReceived(actor, eventTypes)`](#rununtileventreceivedactor-eventtypes)
  - [`runUntilEventSent()`](#rununtileventsent)
  - [`createActorFromLogic(logic, options)`](#createactorfromlogiclogic-options)
  - [`createActorWith(options, logic)`](#createactorwithoptions-logic)
  - [`patchActor(actor, options)`](#patchactoractor-options)
  - [`unpatchActor(actor)`](#unpatchactoractor)
  - [`AuditionOptions`](#auditionoptions)
- [Requirements](#requirements)
- [Installation](#installation)
- [API Notes](#api-notes)
- [License](#license)
- [Disclaimer](#disclaimer)

---

## Usage & Examples

**TL;DR:**

1. Create an `Actor` using `xstate.createActor(logic)`.
2. Create a `Promise<T>` using one of the functions below (e.g., `runUntilDone(actor: Actor) => Promise<T>` where `T` is the _Actor output_). If the actor hadn't yet been started, it will be started now.
3. _If_ your actor needs external input to resolve the condition (e.g., it must receive an event), perform that operation _before_ you `await` the `Promise<T>` (examples below).
4. Now, you can `await` the `Promise<T>` from step 2.
5. Finally, make an assertion about `T`.

### `runUntilDone(actor)`

_Run a Promise Actor or State Machine to Completion_

#### API Docs

- [`runUntilDone(actor)`](https://boneskull.github.io/xstate-audition/functions/runUntilDone.html)
- [`runUntilDoneWith(actor, options)`](https://boneskull.github.io/xstate-audition/functions/runUntilDoneWith.html)
- [`waitForDone(actor)`](https://boneskull.github.io/xstate-audition/functions/waitForDone.html)
- [`waitForDoneWith(actor, options)`](https://boneskull.github.io/xstate-audition/functions/waitForDoneWith.html)

#### Description

`runUntilDone(actor)` / `runUntilDoneWith(actor, options)` are curried functions that will start a [Promise Actor][] or [State Machine Actor][] and run it until it reaches a final state. Once the `Actor` reaches a final state, it will immediately be stopped. The `Promise` will be resolved with the output of the `Actor`.

> [!NOTE]
>
> - `runUntilDone()` is not significantly different than XState's `toPromise()`.
> - `runUntilDoneWith()` may be used to overwrite the internal logger and/or add an inspector callback (or `Observer`) to an `Actor`.
> - _There is no such_ `waitForDone(...)` / `waitForDoneWith(...)` variant, since that would be silly.

#### Example

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
      runUntilDoneWith(actor, {timeout: 100}),
      (err: Error) => {
        assert.equal(err.message, 'Actor did not complete in 100ms');

        return true;
      },
    );
  });
});
```

### `runUntilEmitted(actor, emittedTypes)`

_Run a State Machine Until It Emits Events_

#### API Docs

- [`runUntilEmitted(actor, emittedTypes)`](https://boneskull.github.io/xstate-audition/functions/runUntilEmitted.html)
- [`runUntilEmittedWith(actor, options, emittedTypes)`](https://boneskull.github.io/xstate-audition/functions/runUntilEmittedWith.html)
- [`waitForEmitted(actor, emittedTypes)`](https://boneskull.github.io/xstate-audition/functions/waitForEmitted.html)
- [`waitForEmittedWith(actor, options, emittedTypes)`](https://boneskull.github.io/xstate-audition/functions/waitForEmittedWith.html)

#### Description

`runUntilEmitted(actor, eventTypes)` / `runUntilEmittedWith(actor, options, eventTypes)` are curried function that will start an `Actor` and run it until emits one or more events of the specified `type`. Once the events have been emitted, the actor will immediately be stopped.

`waitForEmitted(actor, eventTypes)` / `waitForEmittedWith(actor, options, eventTypes)` are similar, but do not stop the actor.

> [!NOTE]
>
> This function _only_ applies to events emitted via the [event emitter API][event-emitter].

#### Example

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

### `runUntilTransition(actor, fromStateId, toStateId)`

_Run a State Machine Until It Transitions from One State to Another_

#### API Docs

- [`runUntilTransition(actor, fromStateId, toStateId)`](https://boneskull.github.io/xstate-audition/functions/runUntilTransition.html)
- [`runUntilTransitionWith(actor, options, fromStateId, toStateId)`](https://boneskull.github.io/xstate-audition/functions/runUntilTransitionWith.html)
- [`waitForTransition(actor, fromStateId, toStateId)`](https://boneskull.github.io/xstate-audition/functions/waitForTransition.html)
- [`waitForTransitionWith(actor, options, fromStateId, toStateId)`](https://boneskull.github.io/xstate-audition/functions/waitForTransitionWith.html)

#### Description

`runUntilTransition(actor, fromStateId, toStateId)` / `runUntilTransitionWith(actor, options, fromStateId, toStateId)` are curried functions that will start an `Actor` and run it until it transitions from state with ID `fromStateId` to state with ID `toStateId`. Once the `Actor` transitions to the specified state, it will immediately be stopped.

`waitForTransition(actor, fromStateId, toStateId)` / `waitForStateWith(actor, options, fromStateId, toStateId)` are similar, but do not stop the `Actor`.

#### Example

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
    runWithFirst = runUntilTransition(actor, 'transitionMachine.first');
  });

  it('should transition from "first" to "second"', async () => {
    await runWithFirst('transitionMachine.second');
  });

  it('should not transition from "first" to "third"', async () => {
    await assert.rejects(runWithFirst('transitionMachine.third'));
  });
});
```

### `runUntilSnapshot(actor, predicate)`

_Run a Actor Until It Satisfies a Snapshot Predicate_

#### API Docs

- [`runUntilSnapshot(actor, predicate)`](https://boneskull.github.io/xstate-audition/functions/runUntilSnapshot.html)
- [`runUntilSnapshotWith(actor, options, predicate)`](https://boneskull.github.io/xstate-audition/functions/runUntilSnapshotWith.html)
- [`waitForSnapshot(actor, predicate)`](https://boneskull.github.io/xstate-audition/functions/waitForSnapshot.html)
- [`waitForSnapshotWith(actor, options, predicate)`](https://boneskull.github.io/xstate-audition/functions/waitForSnapshotWith.html)

#### Description

`runUntilSnapshot(actor, predicate)` / `runUntilSnapshotWith(actor, options,  predicate)` are curried functions that will start an `Actor` and run it until the actor's [Snapshot][snapshot] satisfies `predicate` (which is the same type as the `predicate` parameter of [`xstate.waitFor()`][waitFor]). Once the snapshot matches the predicate, the actor will immediately be stopped.

> [!NOTE]
>
> - Like [`runUntilDone()`][runUntilDone], `runUntilSnapshot()` is not significantly different than XState's `waitFor()`.
> - `runUntilSnapshotWith()` may be used to overwrite the internal logger and/or add an inspector callback (or `Observer`) to an Actor.

#### Example

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

    const snapshot = await runUntilSnapshot(actor, (snapshot) =>
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

### `runUntilSpawn(actor, childId)`

_Run a State Machine Actor Until Its System Spawns a Child Actor_

#### API Docs

- [`runUntilSpawn(actor, childId)`](https://boneskull.github.io/xstate-audition/functions/runUntilSpawn.html)
- [`runUntilSpawnWith(actor, options, childId)`](https://boneskull.github.io/xstate-audition/functions/runUntilSpawnWith.html)
- [`waitForSpawn(actor, childId)`](https://boneskull.github.io/xstate-audition/functions/waitForSpawn.html)
- [`waitForSpawnWith(actor, options, childId)`](https://boneskull.github.io/xstate-audition/functions/waitForSpawnWith.html)

#### Description

`runUntilSpawn(actor, childId)` / `runUntilSpawnWith(actor, options, childId)` are curried functions that will start an `Actor` and run it until it spawns a child `ActorRef` with `id` matching `childId` (which may be a `RegExp`). Once the child `ActorRef` is spawned, the `Actor` will immediately be stopped. The `Promise` will be resolved with a reference to the spawned `ActorRef` (an `AnyActorRef` by default).

`waitForSpawn(actor, childId)` / `waitForSpawnWith(actor, options, childId)` are similar, but do not stop the actor.

The root State Machine actor itself needn't spawn the child with the matching `id`, but _any_ `ActorRef` within the root actor's system may spawn the child.

> [!NOTE]
>
> - The _type_ of the spawned `ActorRef` cannot be inferred by ID alone. For this reason, it's recommended to _provide an explicit type argument_ to `runUntilSpawn` (and variants) declaring the type of the spawned `ActorRef`'s `ActorLogic`, as seen in the below example.
> - As of this writing, there is no way to specify the _parent_ of the spawned `ActorRef`.

#### Example

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

### `runUntilEventReceived(actor, eventTypes)`

_Run an Actor Until It Receives an Event_

#### API Docs

- [`runUntilEventReceived(actor, eventTypes)`](https://boneskull.github.io/xstate-audition/functions/runUntilEventReceived.html)
- [`runUntilEventReceivedWith(actor, options, eventTypes)`](https://boneskull.github.io/xstate-audition/functions/runUntilEventReceivedWith.html)
- [`waitForEventReceived(actor, eventTypes)`](https://boneskull.github.io/xstate-audition/functions/waitForEventReceived.html)
- [`waitForEventReceivedWith(actor, options, eventTypes)`](https://boneskull.github.io/xstate-audition/functions/waitForEventReceivedWith.html)

#### Description

`runUntilEventReceived(actor, eventTypes)` / `runUntilEventReceivedWith(actor, options, eventTypes)` are curried functions that will start a [State Machine Actor][], [Callback Actor][], or [Transition Actor][] and run it until it receives event(s) of the specified `type`. Once the event(s) are received, the actor will immediately be stopped. The `Promise` will be resolved with the received event(s).

`runUntilEventReceived()`'s `options` parameter accepts an `otherActorId` (`string` or `RegExp`) property. If set, this will ensure the event was _received from_ the actor with ID matching `otherActorId`.

`withForEventReceived(actor, eventTypes)` / `waitForEventReceivedWith(actor, options, eventTypes)` are similar, but do not stop the actor.

Usage is similar to [`runUntilEmitted()`](#rununtilemittedactor-emittedtypes)—with the exception of the `otherActorId` property as described above.

### `runUntilEventSent()`

_Run an Actor Until It Sends an Event_

#### API Docs

- [`runUntilEventSent(actor, eventTypes)`](https://boneskull.github.io/xstate-audition/functions/runUntilEventSent.html)
- [`runUntilEventSentWith(actor, options, eventTypes)`](https://boneskull.github.io/xstate-audition/functions/runUntilEventSentWith.html)
- [`waitForEventSent(actor, eventTypes)`](https://boneskull.github.io/xstate-audition/functions/waitForEventSent.html)
- [`waitForEventSentWith(actor, options, eventTypes)`](https://boneskull.github.io/xstate-audition/functions/waitForEventSentWith.html)

#### Description

`runUntilEventSent(actor, eventTypes)` / `runUntilEventSentWith(actor, options, eventTypes)` are curried functions that will start an `Actor` and run it until it sends event(s) of the specified `type`. Once the event(s) are sent, the actor will immediately be stopped. The `Promise` will be resolved with the sent event(s).

`runUntilEventSentWith()`'s `options` parameter accepts an `otherActorId` (`string` or `RegExp`) property. If set, this will ensure the event was _sent to_ the actor with ID matching `otherActorId`.

`waitForEventSent(actor, eventTypes)` / `waitForEventSentWith(actor, options, eventTypes)` are similar, but do not stop the actor.

Usage is similar to [`runUntilEmitted()`](#rununtilemittedactor-emittedtypes)—with the exception of the `otherActorId` property as described above.

### `createActorFromLogic(logic, options)`

_Curried Function to Create an Actor from Logic_

#### API Docs

- [`createActorFromLogic(logic, options)`](https://boneskull.github.io/xstate-audition/functions/createActorFromLogic.html)

#### Description

A convenience function for when you find yourself repeatedly creating the same actor with different input.

See also [`createActorWith()`](#createactorwithoptions-logic).

#### Example

```ts
const createActor = createActorFromLogic(myLogic);

it('should do x with input y', () => {
  const actor = createActor({input: 'y'});
  // ...
});

it('should do x2 with input z', () => {
  const actor = createActor({input: 'z'});
  // ...
});
```

### `createActorWith(options, logic)`

_Curried Function to Create an Actor with Options_

#### API Docs

- [`createActorWith(options, logic)`](https://boneskull.github.io/xstate-audition/functions/createActorWith.html)

#### Description

A function for when you find yourself repeatedly creating different actors with the same input.

See also [`createActorFromLogic()`](#createactorfromlogiclogic-options).

#### Example

```ts
const createYActor = createActorWith({input: 'y'}});

it('should do x with FooMachine', () => {
  const actor = createYActor(fooMachine);
  // ...
});

it('should do x2 with BarMachine', () => {
  const actor = createYActor(barMachine);
  // ...
});
```

### `patchActor(actor, options)`

_Modify an Actor for Use with **xstate-audition**_

#### API Docs

- [`patchActor(actor, options)`](https://boneskull.github.io/xstate-audition/functions/patchActor.html)

This is used internally by all of the other curried functions to ~~violate~~ mutate existing actors. You shouldn't need to use it, but it's there if you want to.

### `unpatchActor(actor)`

_Revert Modifications Made to an Actor by **xstate-audition**_

#### API Docs

- [`unpatchActor(actor)`](https://boneskull.github.io/xstate-audition/functions/unpatchActor.html)

#### Description

> [!WARNING]
>
> _This function is experimental and may be removed in a future release._

`unpatchActor(actor)` will "undo" what **xstate-inspector** did in [patchActor](#patchactoractor-options).

If **xstate-audition** has never mutated the `Actor`, this function is a no-op.

### `AuditionOptions`

_Options for many **xstate-audition** Functions_

#### API Docs

- [`AuditionOptions`](https://boneskull.github.io/xstate-audition/types/AuditionOptions.html)

#### Description

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

## Requirements

- Node.js v20.0.0+ or modern browser
- `xstate` v5+

> [!CAUTION]
>
> Haven't tested the browser yet, but there are no dependencies on Node.js builtins.

## Installation

[xstate](https://npm.im/xstate) v5+ is a peer dependency of **xstate-audition**.

```sh
npm install xstate-audition -D
```

## API Notes

- All functions exposed by **xstate-audition**'s are curried. The final return type of each function is `Promise<T>`.
- All functions ending in `With()` accept an [`AuditionOptions`](#auditionoptions) object as the _second_ argument. **If the function name doesn't end with `With()`, it does not accept an `AuditionOptions` object** (excepting [`createActorFromLogic`](#createactorfromlogiclogic-options)).
- Any inspectors _already attached_ to an `Actor` provided to **xstate-audition** will be preserved.
- At this time, **xstate-audition** offers no mechanism to set global defaults for [`AuditionOptions`][AuditionOptions].

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
[runUntilDone]: #rununtildoneactor
[boneskull]: https://github.com/boneskull
[event-emitter]: https://stately.ai/docs/event-emitter
