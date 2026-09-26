import type { InsightsProvider } from '../../src/modules/insights/InsightsProvider';
import { IpInfoInsightsAdapter } from '../../src/modules/insights/IpInfoInsightsAdapter';
import { IpInfoLiteInsightsAdapter } from '../../src/modules/insights/IpInfoLiteInsightsAdapter';

const mockFetchResponse = (response: Partial<Response>) =>
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);

const cases: {
  name: string;
  create: () => InsightsProvider;
  url: string;
  payload: Record<string, unknown>;
}[] = [
  {
    name: 'ipinfo-free',
    create: () => new IpInfoInsightsAdapter(),
    url: 'https://ipinfo.io/json',
    payload: {
      ip: '203.0.113.7',
      city: 'Kyiv',
      country: 'UA',
      loc: '50.4501,30.5234',
      org: 'AS12345 Example ISP',
    },
  },
  {
    name: 'ipinfo-lite',
    create: () => new IpInfoLiteInsightsAdapter({ ipInfoLiteToken: 'tok123' }),
    url: 'https://api.ipinfo.io/lite/me?token=tok123',
    payload: {
      ip: '203.0.113.7',
      asn: 'AS12345',
      as_name: 'Example ISP',
      country_code: 'UA',
      continent: 'Europe',
    },
  },
];

describe.each(cases)('$name adapter', ({ name, create, url, payload }) => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exposes its name', () => {
    expect(create().name).toBe(name);
  });

  it('requests the expected URL and forwards the signal', async () => {
    const fetchSpy = mockFetchResponse({
      ok: true,
      json: async () => payload,
    });
    const { signal } = new AbortController();

    await create().fetchInsights(signal);

    expect(fetchSpy).toHaveBeenCalledWith(url, { signal });
  });

  it('maps the response to UserInsights and drops extra fields', async () => {
    mockFetchResponse({ ok: true, json: async () => payload });

    await expect(create().fetchInsights()).resolves.toStrictEqual({
      ip: '203.0.113.7',
    });
  });

  it('throws with provider name and status on a non-OK response', async () => {
    const json = jest.fn();
    mockFetchResponse({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json,
    });

    await expect(create().fetchInsights()).rejects.toThrow(
      `${name}: HTTP 429 Too Many Requests`,
    );
    expect(json).not.toHaveBeenCalled();
  });

  it('propagates network errors', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('Network request failed'));

    await expect(create().fetchInsights()).rejects.toThrow(
      'Network request failed',
    );
  });

  it('propagates JSON parse errors', async () => {
    mockFetchResponse({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });

    await expect(create().fetchInsights()).rejects.toThrow(SyntaxError);
  });
});
