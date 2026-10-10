import {locate} from '~/modules/speedtest/engines/ndt7/locate';
import {
  jsonResponse,
  locateEntry,
  locateResponse,
} from '../../../../support/fixtures/ndt7';

function run(fetchFn: jest.Mock, signal = new AbortController().signal) {
  return locate({
    fetch: fetchFn as unknown as typeof fetch,
    clientVersion: '0.1.0',
    signal,
  });
}

describe('locate', () => {
  it('requests the nearest ndt7 servers with client name and version', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(locateResponse));
    await run(fetchFn);
    expect(fetchFn.mock.calls[0][0]).toBe(
      'https://locate.measurementlab.net/v2/nearest/ndt/ndt7?client_name=streamready&client_version=0.1.0',
    );
  });

  it('maps results to targets in order', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(locateResponse));
    const targets = await run(fetchFn);
    expect(targets).toHaveLength(4);
    expect(targets[0]).toEqual({
      server: {
        machine: 'mlab1-tst01.mlab-sandbox.measurement-lab.example',
        city: 'Testville 1',
        country: 'ZZ',
      },
      // Plain ws:// only: the native engine has no TLS (ADR 0006).
      downloadUrl: 'ws://ndt-1.example/ndt/v7/download?access_token=REDACTED',
      uploadUrl: 'ws://ndt-1.example/ndt/v7/upload?access_token=REDACTED',
    });
  });

  it('skips entries without both ws urls or a machine', async () => {
    const noUpload = locateEntry(1);
    const urls: Record<string, string> = {...noUpload.urls};
    delete urls['ws:///ndt/v7/upload'];
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse({
        results: [
          {...noUpload, urls},
          {...locateEntry(2), machine: 42},
          locateEntry(3),
        ],
      }),
    );
    const targets = await run(fetchFn);
    expect(targets.map((t) => t.server.machine)).toEqual([
      'mlab3-tst03.mlab-sandbox.measurement-lab.example',
    ]);
  });

  it('omits missing location fields', async () => {
    const entry: Partial<ReturnType<typeof locateEntry>> = locateEntry(1);
    delete entry.location;
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({results: [entry]}));
    const [target] = await run(fetchFn);
    expect(target.server).toEqual({
      machine: 'mlab1-tst01.mlab-sandbox.measurement-lab.example',
    });
  });

  test.each([
    ['empty results', {results: []}],
    ['no results key', {}],
    ['only unusable entries', {results: [{machine: 'x'}]}],
  ])('rejects no_servers for %s', async (_name, body) => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(body));
    await expect(run(fetchFn)).rejects.toMatchObject({code: 'no_servers'});
  });

  test.each([
    ['network error', () => jest.fn().mockRejectedValue(new TypeError('net'))],
    ['http 503', () => jest.fn().mockResolvedValue(jsonResponse({}, 503))],
    ['non-object body', () => jest.fn().mockResolvedValue(jsonResponse('x'))],
  ])('rejects locate_failed on %s', async (_name, make) => {
    await expect(run(make())).rejects.toMatchObject({code: 'locate_failed'});
  });

  it('rejects aborted when the signal aborts', async () => {
    const controller = new AbortController();
    const fetchFn = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    const promise = run(fetchFn, controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({code: 'aborted'});
  });
});
