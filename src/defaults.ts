/**
 * Provides {@link applyDefaults}
 *
 * @module
 */

import type {AuditionOptions} from './types.js';

import {DEFAULT_TIMEOUT, noop} from './util.js';

/**
 * Applies defaults to an {@link AuditionOptions} object.
 *
 * @param options Any options (or not)
 * @returns A new `AuditionOptions` object with defaults applied
 */
export function applyDefaults<T extends AuditionOptions>(
  options?: T,
): Omit<T, keyof Required<AuditionOptions>> & Required<AuditionOptions> {
  const {
    inspector = noop,
    logger = noop,
    timeout = DEFAULT_TIMEOUT,
    ...rest
  } = options ?? {};

  const extra = rest as Omit<T, keyof AuditionOptions>;

  return {
    ...extra,
    inspector,
    logger,
    timeout,
  };
}
