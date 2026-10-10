import {fetchJson} from '~/shared/lib/http';

import type {GeoIpProvider} from '../domain/connection';
import {countryName} from '../domain/countries';
import {
  asRecord,
  optionalString,
  requireCountryCode,
  requireString,
  stripAsn,
  type ProviderOptions,
} from './parse';

export const GEOJS_URL = 'https://get.geojs.io/v1/ip/geo.json';

export function createGeojsProvider({
  timeoutMs,
  fetchFn,
}: ProviderOptions): GeoIpProvider {
  return {
    id: 'geojs',
    async lookup(signal) {
      const body = asRecord(
        await fetchJson<unknown>(GEOJS_URL, {
          timeoutMs,
          signal,
          fetchFn,
          headers: {Accept: 'application/json'},
        }),
      );
      const countryCode = requireCountryCode(body.country_code);
      return {
        ip: requireString(body.ip),
        countryCode,
        country: optionalString(body.country) ?? countryName(countryCode),
        city: optionalString(body.city),
        isp:
          optionalString(body.organization_name) ??
          stripAsn(optionalString(body.organization)),
      };
    },
  };
}
