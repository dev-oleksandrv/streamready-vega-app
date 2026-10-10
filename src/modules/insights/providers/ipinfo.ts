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

export const IPINFO_URL = 'https://ipinfo.io/json';

/** Tokenless: returns the country as a code only, and the ISP inside `org` after the ASN. */
export function createIpinfoProvider({
  timeoutMs,
  fetchFn,
}: ProviderOptions): GeoIpProvider {
  return {
    id: 'ipinfo',
    async lookup(signal) {
      const body = asRecord(
        await fetchJson<unknown>(IPINFO_URL, {
          timeoutMs,
          signal,
          fetchFn,
          headers: {Accept: 'application/json'},
        }),
      );
      const countryCode = requireCountryCode(body.country);
      return {
        ip: requireString(body.ip),
        countryCode,
        country: countryName(countryCode),
        city: optionalString(body.city),
        isp: stripAsn(optionalString(body.org)),
      };
    },
  };
}
