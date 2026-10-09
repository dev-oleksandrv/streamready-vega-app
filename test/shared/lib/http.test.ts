import {fetchJson, HttpError} from '~/shared/lib/http';

const URL = 'https://api.example.test/json';

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);

/** A fetch that never settles until its signal aborts. */
const hangingFetch = jest.fn(
  (_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new Error('aborted')),
      );
    }),
) as unknown as typeof fetch;

afterEach(() => {
  jest.useRealTimers();
});

describe('fetchJson', () => {
  it('resolves parsed JSON', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({ip: '203.0.113.7'}));
    await expect(fetchJson(URL, {timeoutMs: 1000, fetchFn})).resolves.toEqual({
      ip: '203.0.113.7',
    });
    expect(fetchFn).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({signal: expect.anything()}),
    );
  });

  it('passes headers through', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse({}));
    await fetchJson(URL, {
      timeoutMs: 1000,
      fetchFn,
      headers: {Accept: 'application/json'},
    });
    expect(fetchFn.mock.calls[0][1].headers).toEqual({
      Accept: 'application/json',
    });
  });

  it('rejects with status for non-2xx', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse({}, 429));
    await expect(
      fetchJson(URL, {timeoutMs: 1000, fetchFn}),
    ).rejects.toMatchObject({
      kind: 'status',
      status: 429,
    });
  });

  it('rejects with parse when the body is not JSON', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    });
    await expect(
      fetchJson(URL, {timeoutMs: 1000, fetchFn}),
    ).rejects.toMatchObject({
      kind: 'parse',
    });
  });

  it('rejects with network when fetch rejects', async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValue(new TypeError('Network request failed'));
    await expect(
      fetchJson(URL, {timeoutMs: 1000, fetchFn}),
    ).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('rejects with timeout after timeoutMs', async () => {
    jest.useFakeTimers();
    const pending = fetchJson(URL, {timeoutMs: 5000, fetchFn: hangingFetch});
    jest.advanceTimersByTime(5000);
    await expect(pending).rejects.toMatchObject({kind: 'timeout'});
  });

  it('rejects with aborted when the caller aborts', async () => {
    const controller = new AbortController();
    const pending = fetchJson(URL, {
      timeoutMs: 5000,
      fetchFn: hangingFetch,
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({kind: 'aborted'});
  });

  it('rejects with aborted immediately if the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchFn = jest.fn();
    await expect(
      fetchJson(URL, {timeoutMs: 5000, fetchFn, signal: controller.signal}),
    ).rejects.toMatchObject({kind: 'aborted'});
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('clears the timer and the abort listener after settling', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const removeSpy = jest.spyOn(controller.signal, 'removeEventListener');
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse({}));
    await fetchJson(URL, {timeoutMs: 5000, fetchFn, signal: controller.signal});
    expect(jest.getTimerCount()).toBe(0);
    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('reports a timeout while the body is still being read as timeout', async () => {
    jest.useFakeTimers();
    const fetchFn = jest.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: () =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    })) as unknown as typeof fetch;
    const pending = fetchJson(URL, {timeoutMs: 5000, fetchFn});
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(5000);
    await expect(pending).rejects.toMatchObject({kind: 'timeout'});
  });

  it('is an HttpError instance', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('x'));
    await expect(
      fetchJson(URL, {timeoutMs: 1000, fetchFn}),
    ).rejects.toBeInstanceOf(HttpError);
  });
});
