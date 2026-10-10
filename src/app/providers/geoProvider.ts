import {
  createGeojsProvider,
  createIpinfoProvider,
  fallbackChain,
  type GeoIpProvider,
} from '~/modules/insights';

import {INSIGHTS_TIMEOUT_MS} from '../config/app';

/** ipinfo first, geojs as fallback (ADR 0004); both share one deadline. */
export function createGeoProvider(fetchFn?: typeof fetch): GeoIpProvider {
  const opts = {timeoutMs: INSIGHTS_TIMEOUT_MS, fetchFn};
  return fallbackChain(
    [createIpinfoProvider(opts), createGeojsProvider(opts)],
    {timeoutMs: INSIGHTS_TIMEOUT_MS},
  );
}
