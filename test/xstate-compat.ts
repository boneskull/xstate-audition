#!/usr/bin/env tsx
/**
 * This script runs the test suite against all versions of `xstate` greater than
 * or equal to the {@link knownMinimum known minimum version}.
 *
 * This version should be the base for the `peerDependencies.xstate` range in
 * `package.json`.
 *
 * Any version newer than the known minimum which fails the test suite will be
 * reported, and this script will fail with a non-zero exit code.
 *
 * Upon completion, the minimum version that passed the test will be logged to
 * `STDOUT`.
 *
 * @packageDocumentation
 */

import {minVersion, parse, Range, satisfies} from 'semver';
import {$, type ProcessOutput} from 'zx';

import pkg from '../package.json' with {type: 'json'};

const {peerDependencies} = pkg;

const main = async (): Promise<void> => {
  /**
   * The range of `xstate` versions that `xstate-audition` is compatible with.
   */
  const range = new Range(peerDependencies.xstate);

  /**
   * The known minimum version of `xstate` that works with `xstate-audition`.
   */
  const knownMinimum = minVersion(range)!.format();

  /**
   * All versions of `xstate` available on npm
   */
  const allVersions = await $`npm show xstate versions --json`.json<string[]>();

  /**
   * All versions newer than the known minimum (inclusive)
   *
   * Versions must be `SemVer` versions and not naughty things instead
   */
  const versionsUnderTest = allVersions
    .slice(allVersions.indexOf(knownMinimum))
    .filter((version) => parse(version) !== null);

  /**
   * The minimum version that passed the test suite
   */
  let foundMinimum: string = '';

  // We abort this signal upon SIGINT
  const ac = new AbortController();

  const {signal} = ac;

  if (!process.env.CI) {
    process
      // if we got CTRL-C, then we need to restore the xstate version
      .once('SIGINT', (signal) => {
        ac.abort();
        process.stderr.write('\nAborted; restoring xstate version …');
        void $.sync({quiet: true})`npm install --force`;
        process.stderr.write(' done\n');
        process.emit('SIGINT', signal);
      })
      // and we need to restore it before exit as well
      .once('beforeExit', () => {
        process.stderr.write('\nRestoring xstate version …');
        void $.sync({quiet: true})`npm install --force`;
        process.stderr.write(' done\n');
      });
  } else {
    process.once('beforeExit', () => {
      console.error('CI detected; skipping version restoration');
    });
  }

  type Failure = {
    error: ProcessOutput;
    version: string;
  };

  const unexpectedFailures: Failure[] = [];

  // unfortunately this must run in serial
  for (const version of versionsUnderTest) {
    try {
      await $({quiet: true, signal})`npm i xstate@${version} --no-save`;
    } catch (err) {
      if (signal.aborted) {
        continue;
      }
      console.error(`xstate@${version} - uninstallable`, err);
      continue;
    }
    try {
      process.stderr.write(`xstate@${version} …`);
      await $({quiet: true, signal})`npm run build && npm test`;
      foundMinimum ||= version;
      process.stderr.write(` OK\n`);
    } catch (err) {
      if (signal.aborted) {
        continue;
      }
      process.stderr.write(` NOT OK\n`);
      unexpectedFailures.push({error: err as ProcessOutput, version});
    }
  }

  if (signal.aborted) {
    process.exitCode = 1;

    return;
  }

  if (unexpectedFailures.length) {
    console.error('Unexpected failures:');
    for (const {error, version} of unexpectedFailures) {
      console.error(`xstate@${version}:`);
      console.error(error);
    }
    process.exitCode = 1;

    return;
  }

  if (foundMinimum) {
    console.error('Minimum compatible version:', foundMinimum);
    if (!satisfies(foundMinimum, range)) {
      console.error('Minimum version does not satisfy range:', range);
      process.exitCode = 1;
    }

    return;
  }

  console.error('No passing versions found!');
  process.exitCode = 1;
};

void main();
