import {
  createGeojsProvider,
  GEOJS_URL,
} from '~/modules/insights/providers/geojs';

const json = (body: unknown) =>
  ({ok: true, status: 200, json: async () => body} as unknown as Response);

const lookup = (body: unknown) => {
  const fetchFn = jest.fn().mockResolvedValue(json(body));
  const provider = createGeojsProvider({timeoutMs: 1000, fetchFn});
  return {fetchFn, result: provider.lookup(new AbortController().signal)};
};

describe('geojs provider', () => {
  it('maps a full response', async () => {
    const {fetchFn, result} = lookup({
      ip: '203.0.113.7',
      country: 'Germany',
      country_code: 'DE',
      city: 'Berlin',
      organization: 'AS64500 Example Net GmbH',
      organization_name: 'Example Net GmbH',
    });
    await expect(result).resolves.toEqual({
      ip: '203.0.113.7',
      countryCode: 'DE',
      country: 'Germany',
      city: 'Berlin',
      isp: 'Example Net GmbH',
    });
    expect(fetchFn.mock.calls[0][0]).toBe(GEOJS_URL);
  });

  it('uses the table name when country is missing and strips the ASN from organization', async () => {
    const {result} = lookup({
      ip: '2001:db8::1',
      country_code: 'gb',
      organization: 'AS64501 Example Fibre',
    });
    await expect(result).resolves.toEqual({
      ip: '2001:db8::1',
      countryCode: 'GB',
      country: 'United Kingdom',
      isp: 'Example Fibre',
    });
  });

  it.each([
    ['missing ip', {country_code: 'DE'}],
    ['missing country_code', {ip: '203.0.113.7', country: 'Germany'}],
    ['blank ip', {ip: '  ', country_code: 'DE'}],
  ])('%s is a parse error', async (_name, body) => {
    await expect(lookup(body).result).rejects.toMatchObject({kind: 'parse'});
  });
});
