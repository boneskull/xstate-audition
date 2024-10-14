#!/usr/bin/env tsx
/**
 * This script runs the test suite against all versions of `xstate` greater than
 * or equal to the {@link KNOWN_MINIMUM known minimum version}.
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

import {minVersion, parse, Range} from 'semver';
import {$, type ProcessOutput} from 'zx';

import {peerDependencies} from '../package.json' with {type: 'json'};

/**
 * The known minimum version of `xstate` that works with `xstate-audition`.
 */
const KNOWN_MINIMUM = minVersion(new Range(peerDependencies.xstate))!.format();

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
  .slice(allVersions.indexOf(KNOWN_MINIMUM))
  .filter((version) => parse(version) !== null);

/**
 * The minimum version that passed the test suite
 */
let foundMinimum: string = '';

// We abort this signal upon SIGINT
const ac = new AbortController();

const {signal} = ac;

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

type Failure = {
  error: ProcessOutput;
  version: string;
};

const unexpectedFailures: Failure[] = [];

// unfortunately this must run in serial
for (const version of versionsUnderTest) {
  if (signal.aborted) {
    continue;
  }
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

if (!signal.aborted) {
  if (unexpectedFailures.length) {
    console.error('Unexpected failures:');
    for (const {error, version} of unexpectedFailures) {
      console.error(`xstate@${version}:`);
      console.error(error);
    }
    process.exitCode = 1;
  }
  if (foundMinimum) {
    console.log('Minimum compatible version:', foundMinimum);
  } else {
    console.error('No passing versions found!');
    process.exitCode = 1;
  }
}
