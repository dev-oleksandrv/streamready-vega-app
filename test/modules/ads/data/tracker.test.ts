import {createTracker} from '~/modules/ads';
import {createLogger} from '~/shared/lib/logger';

const T0 = Date.UTC(2026, 10, 5, 20, 0, 0);

function setup(
  fetchImpl?: (url: string, init?: RequestInit) => Promise<unknown>,
) {
  const sink = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const fetchFn = jest.fn(
    fetchImpl ?? (async () => ({ok: true, status: 200})),
  ) as unknown as jest.Mock & typeof fetch;
  const tracker = createTracker({
    fetchFn,
    now: () => T0,
    random: () => 0.5,
    logger: createLogger('ads', {enabled: true, sink}),
  });
  const logged = () =>
    JSON.stringify(Object.values(sink).flatMap((fn) => fn.mock.calls));
  return {tracker, fetchFn, logged};
}

const flush = () =>
  new Promise<void>((resolve) => setImmediate(() => resolve()));

afterEach(() => {
  jest.useRealTimers();
});

describe('tracker', () => {
  it('sends one GET per URL with macros filled in', async () => {
    const {tracker, fetchFn} = setup();
    tracker.fire(
      [
        'https://ads.example/err?code=[ERRORCODE]&cb=[CACHEBUSTING]',
        'https://ads.example/imp',
      ],
      {ERRORCODE: 303},
    );
    await flush();
    expect(fetchFn.mock.calls.map((c) => c[0])).toEqual([
      'https://ads.example/err?code=303&cb=50000000',
      'https://ads.example/imp',
    ]);
    expect(fetchFn.mock.calls[0][1]).toMatchObject({method: 'GET'});
    expect(fetchFn.mock.calls[0][1].body).toBeUndefined();
  });

  it('sends each URL once', async () => {
    const {tracker, fetchFn} = setup();
    tracker.fire(['https://ads.example/imp', 'https://ads.example/imp']);
    await flush();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('skips URLs that are not http(s)', async () => {
    const {tracker, fetchFn} = setup();
    tracker.fire(['', 'ftp://ads.example/imp', 'not a url']);
    await flush();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('swallows failures and never retries', async () => {
    const {tracker, fetchFn} = setup(async () => {
      throw new TypeError('Network request failed');
    });
    expect(() => tracker.fire(['https://ads.example/imp'])).not.toThrow();
    await flush();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('survives a fetch that throws synchronously', () => {
    const {tracker} = setup(() => {
      throw new Error('boom');
    });
    expect(() =>
      tracker.fire(['https://ads.example/a', 'https://ads.example/b']),
    ).not.toThrow();
  });

  it('sends nothing when the signal is already aborted', async () => {
    const {tracker, fetchFn} = setup();
    const controller = new AbortController();
    controller.abort();
    tracker.fire(['https://ads.example/imp'], {}, controller.signal);
    await flush();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('cancels beacons in flight when the signal aborts', async () => {
    let requestSignal: AbortSignal | undefined;
    const {tracker} = setup(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          requestSignal = init?.signal ?? undefined;
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    const controller = new AbortController();
    tracker.fire(['https://ads.example/imp'], {}, controller.signal);
    expect(requestSignal?.aborted).toBe(false);
    controller.abort();
    expect(requestSignal?.aborted).toBe(true);
    await flush();
  });

  it('gives up on a beacon after 5 s', async () => {
    jest.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const {tracker} = setup(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          requestSignal = init?.signal ?? undefined;
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    tracker.fire(['https://ads.example/imp']);
    jest.advanceTimersByTime(4999);
    expect(requestSignal?.aborted).toBe(false);
    jest.advanceTimersByTime(1);
    expect(requestSignal?.aborted).toBe(true);
  });

  it('never logs a URL', async () => {
    const {tracker, logged} = setup(async () => {
      throw new Error('https://ads.example/imp failed');
    });
    tracker.fire(['https://ads.example/imp']);
    await flush();
    expect(logged()).not.toMatch(/example|https?:/);
  });
});
