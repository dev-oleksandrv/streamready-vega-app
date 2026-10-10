import {
  createIpinfoProvider,
  IPINFO_URL,
} from '~/modules/insights/providers/ipinfo';

const json = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);

const lookup = (body: unknown, status?: number) => {
  const fetchFn = jest.fn().mockResolvedValue(json(body, status));
  const provider = createIpinfoProvider({timeoutMs: 1000, fetchFn});
  return {fetchFn, result: provider.lookup(new AbortController().signal)};
};

describe('ipinfo provider', () => {
  it('maps a full response', async () => {
    const {fetchFn, result} = lookup({
      ip: '203.0.113.7',
      city: 'Berlin',
      region: 'Berlin',
      country: 'DE',
      org: 'AS64500 Example Net GmbH',
    });
    await expect(result).resolves.toEqual({
      ip: '203.0.113.7',
      countryCode: 'DE',
      country: 'Germany',
      city: 'Berlin',
      isp: 'Example Net GmbH',
    });
    expect(fetchFn.mock.calls[0][0]).toBe(IPINFO_URL);
  });

  it('accepts IPv6 and a lower-case code; city and org optional', async () => {
    const {result} = lookup({ip: '2001:db8::1', country: 'us'});
    await expect(result).resolves.toEqual({
      ip: '2001:db8::1',
      countryCode: 'US',
      country: 'United States',
    });
  });

  it('keeps an org without an ASN prefix as-is', async () => {
    const {result} = lookup({
      ip: '203.0.113.7',
      country: 'DE',
      org: 'Example Net',
    });
    await expect(result).resolves.toMatchObject({isp: 'Example Net'});
  });

  it('falls back to the code for an unknown country', async () => {
    const {result} = lookup({ip: '203.0.113.7', country: 'XZ'});
    await expect(result).resolves.toMatchObject({
      countryCode: 'XZ',
      country: 'XZ',
    });
  });

  it.each([
    ['missing ip', {country: 'DE'}],
    [
      'missing country (rate-limited / bogon reply)',
      {ip: '203.0.113.7', bogon: true},
    ],
    ['bad country', {ip: '203.0.113.7', country: 'Germany'}],
    ['not an object', 'nope'],
    ['null body', null],
  ])('%s is a parse error', async (_name, body) => {
    await expect(lookup(body).result).rejects.toMatchObject({kind: 'parse'});
  });

  it('passes HTTP status errors through', async () => {
    await expect(lookup({}, 429).result).rejects.toMatchObject({
      kind: 'status',
      status: 429,
    });
  });

  it('never puts the IP in the error message', async () => {
    const error = await lookup({ip: '203.0.113.7'}).result.catch(
      (e: Error) => e,
    );
    expect(String(error)).not.toContain('203.0.113.7');
  });
});
