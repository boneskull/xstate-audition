/**
 * Provides {@link applyDefaults}
 *
 * @module
 */

import type {AuditionOptions} from './types.js';

import {DEFAULT_TIMEOUT} from './util.js';

/**
 * Applies defaults to an {@link AuditionOptions} object.
 *
 * Currently, this only applies a default `timeout` value.
 *
 * @param options Any options (or not)
 * @returns A new `AuditionOptions` object with defaults applied
 */
export function applyDefaults<T extends AuditionOptions>(
  options?: T,
): {timeout: number} & AuditionOptions & Omit<T, keyof AuditionOptions> {
  const {inspector, logger, timeout = DEFAULT_TIMEOUT, ...rest} = options ?? {};

  const extra = rest as Omit<T, keyof AuditionOptions>;

  return {
    ...extra,
    inspector,
    logger,
    timeout,
  };
}
