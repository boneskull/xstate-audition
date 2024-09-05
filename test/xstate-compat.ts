#!/usr/bin/env tsx

import {setMaxListeners} from 'node:events';
import {parse} from 'semver';
import {$} from 'zx';

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
// zx doesn't dispose its signal listeners, apparently
setMaxListeners(30);

/**
 * The known minimum version of `xstate` that works with `xstate-audition`.
 */
const KNOWN_MINIMUM = '5.14.0';

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

const unexpectedFailures: string[] = [];

// unfortunately this must run in serial
for (const version of versionsUnderTest) {
  if (signal.aborted) {
    continue;
  }
  try {
    await $({signal})`npm i xstate@${version} --no-save`;
  } catch (err) {
    if (signal.aborted) {
      continue;
    }
    console.error(`xstate@${version} - uninstallable`, err);
    continue;
  }
  try {
    process.stderr.write(`xstate@${version} …`);
    await $({signal})`npm test`;
    foundMinimum ||= version;
    process.stderr.write(` OK\n`);
  } catch (err) {
    if (signal.aborted) {
      continue;
    }
    process.stderr.write(` NOT OK\n`);
    console.error(err);
    if (foundMinimum) {
      unexpectedFailures.push(version);
    }
  }
}

if (!signal.aborted) {
  if (unexpectedFailures.length) {
    console.error('Unexpected failures:', unexpectedFailures.join(', '));
    process.exitCode = 1;
  }
  if (foundMinimum) {
    console.log(foundMinimum);
  } else {
    console.error('No passing versions found!');
    process.exitCode = 1;
  }
}
