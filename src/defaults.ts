import type {AuditionOptions} from './types.js';

import {DEFAULT_TIMEOUT, defaultIsDebugMode, noop} from './util.js';

export function applyDefaults<T extends AuditionOptions>(
  options?: T,
): Omit<T, keyof Required<AuditionOptions>> & Required<AuditionOptions> {
  const {
    inspector = noop,
    isDebugMode = defaultIsDebugMode,
    logger = noop,
    stop = false,
    timeout: originalTimeout,
    ...rest
  } = options ?? {};

  const extra = rest as Omit<T, keyof AuditionOptions>;

  const timeout = isDebugMode()
    ? Infinity
    : (originalTimeout ?? DEFAULT_TIMEOUT);

  return {
    ...extra,
    inspector,
    isDebugMode,
    logger,
    stop,
    timeout,
  };
}
