import {strict as assert} from 'node:assert';
import {afterEach, describe, it} from 'node:test';
import {Actor} from 'xstate';

import {createActorFromLogic, createActorWith} from '../src/create-actor.js';
import {dummyLogic} from './fixture.js';

describe('create-actor', () => {
  describe('createActorFromLogic()', () => {
    let actor: Actor<typeof dummyLogic>;

    afterEach(() => {
      if (actor) {
        actor.stop();
      }
    });

    describe('when called with logic and options', () => {
      it('should create an actor with the provided logic and options', () => {
        const options = {id: 'test-actor'};

        actor = createActorFromLogic(dummyLogic, options);

        assert.ok(actor instanceof Actor);
      });
    });

    describe('when called with only logic', () => {
      it('should return a curried function that accepts options', () => {
        const curriedFn = createActorFromLogic(dummyLogic);

        assert.equal(typeof curriedFn, 'function');

        const options = {id: 'test-actor'};

        actor = curriedFn(options);

        assert.equal(actor.id, options.id);
        assert.equal(actor.logic, dummyLogic);
      });
    });

    describe('when called with no arguments', () => {
      it('should return itself', () => {
        const curriedFn = createActorFromLogic();

        assert.equal(curriedFn, createActorFromLogic);
      });
    });
  });

  describe('createActorWith()', () => {
    let actor: Actor<typeof dummyLogic>;

    afterEach(() => {
      if (actor) {
        actor.stop();
      }
    });

    describe('when called with logic and options', () => {
      it('should create an actor with the provided logic and options', () => {
        const options = {id: 'test-actor'};

        actor = createActorWith(options, dummyLogic);

        assert.ok(actor instanceof Actor);
        assert.equal(actor.id, options.id);
        assert.equal(actor.logic, dummyLogic);
      });
    });

    describe('when called with only options', () => {
      it('should return a curried function that accepts logic', () => {
        const options = {id: 'test-actor'};

        const curriedFn = createActorWith<typeof dummyLogic>(options);

        assert.equal(typeof curriedFn, 'function');

        actor = curriedFn(dummyLogic);

        assert.ok(actor instanceof Actor);
        assert.equal(actor.id, options.id);
        assert.equal(actor.logic, dummyLogic);
      });
    });

    describe('when called with no arguments', () => {
      it('should return itself', () => {
        const curriedFn = createActorWith();

        assert.equal(curriedFn, createActorWith);
      });
    });
  });
});
