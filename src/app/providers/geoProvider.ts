import {
  createGeojsProvider,
  createIpinfoProvider,
  fallbackChain,
  type GeoIpProvider,
} from '~/modules/insights';

import {INSIGHTS_ATTEMPT_MS, INSIGHTS_TIMEOUT_MS} from '../config/app';

/**
 * ipinfo first, geojs as fallback (ADR 0004). Each attempt has its own budget
 * so an unreachable ipinfo can't use up the whole shared deadline.
 */
export function createGeoProvider(fetchFn?: typeof fetch): GeoIpProvider {
  const opts = {timeoutMs: INSIGHTS_ATTEMPT_MS, fetchFn};
  return fallbackChain(
    [createIpinfoProvider(opts), createGeojsProvider(opts)],
    {timeoutMs: INSIGHTS_TIMEOUT_MS},
  );
}
