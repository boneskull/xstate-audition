import {strict as assert} from 'node:assert';
import {describe, it} from 'node:test';
import {createActor} from 'xstate';

import {attachActor} from '../src/actor.js';
import {type AuditionOptions} from '../src/types.js';
import {noop} from '../src/util.js';
import {dummyLogic} from './fixture.js';

describe('xstate-audition', () => {
  describe('actor', () => {
    describe('attachActor()', () => {
      // TODO: needs spies; buried in Observable stuff
      it.todo('should set the custom inspector if provided');

      it('should set the custom logger if provided', () => {
        const actor = createActor(dummyLogic);

        const customLogger = () => {};

        const options: AuditionOptions = {logger: customLogger};

        attachActor(actor, options);

        // @ts-expect-error private
        assert.equal(actor.logger, customLogger);
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        assert.equal(actor._actorScope.logger, customLogger);
      });

      // TODO: needs spies; buried in Observable stuff
      it.todo('should use the default inspector if none is provided');

      it('should use the default logger if none is provided', () => {
        const logger = () => {};

        const actor = createActor(dummyLogic, {logger});

        const options: AuditionOptions = {};

        attachActor(actor, options);

        // @ts-expect-error private
        assert.equal(actor.logger, noop);
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        assert.equal(actor._actorScope.logger, noop);
      });
    });
  });
});
