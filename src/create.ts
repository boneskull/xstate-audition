import {type AnyActorLogic, type AnyStateMachine} from 'xstate';

import {ActorRunner} from './actor-runner.js';
import {StateMachineActorRunner} from './state-machine-runner.js';
import {type ActorRunnerOptions} from './types.js';
import {isStateMachine} from './util.js';

export function createActorRunner<T extends AnyStateMachine>(
  stateMachine: T,
  options?: ActorRunnerOptions,
): StateMachineActorRunner<T>;

export function createActorRunner<T extends AnyActorLogic>(
  actorLogic: T,
  options?: ActorRunnerOptions,
): ActorRunner<T>;

export function createActorRunner<T extends AnyActorLogic | AnyStateMachine>(
  actorLogic: T,
  options?: ActorRunnerOptions,
) {
  if (isStateMachine(actorLogic)) {
    const runner = ActorRunner.create(actorLogic, options);
    return new StateMachineActorRunner(runner);
  }
  return ActorRunner.create(actorLogic, options);
}
