import {createGeoProvider} from '~/app/providers/geoProvider';

const json = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);

beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe('createGeoProvider', () => {
  it('asks ipinfo first', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(json({ip: '203.0.113.7', country: 'DE'}));
    await expect(
      createGeoProvider(fetchFn).lookup(new AbortController().signal),
    ).resolves.toMatchObject({ip: '203.0.113.7', country: 'Germany'});
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe('https://ipinfo.io/json');
  });

  it('falls back to geojs', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(json({}, 429))
      .mockResolvedValueOnce(
        json({ip: '203.0.113.7', country_code: 'FR', country: 'France'}),
      );
    await expect(
      createGeoProvider(fetchFn).lookup(new AbortController().signal),
    ).resolves.toMatchObject({countryCode: 'FR'});
    expect(fetchFn.mock.calls[1][0]).toBe(
      'https://get.geojs.io/v1/ip/geo.json',
    );
  });

  it('still tries geojs when ipinfo hangs', async () => {
    jest.useFakeTimers();
    const fetchFn = jest.fn((url: string, init?: RequestInit) =>
      url.includes('ipinfo')
        ? new Promise<Response>((_resolve, reject) =>
            init?.signal?.addEventListener('abort', () =>
              reject(new Error('aborted')),
            ),
          )
        : Promise.resolve(
            json({ip: '203.0.113.7', country_code: 'FR', country: 'France'}),
          ),
    ) as unknown as typeof fetch;
    const pending = createGeoProvider(fetchFn).lookup(
      new AbortController().signal,
    );
    jest.advanceTimersByTime(3000);
    await expect(pending).resolves.toMatchObject({countryCode: 'FR'});
    jest.useRealTimers();
  });
});
