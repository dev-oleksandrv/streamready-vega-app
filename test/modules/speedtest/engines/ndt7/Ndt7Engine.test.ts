import {Ndt7Engine, type EngineEvent} from '~/modules/speedtest';
import {fakeSocketFactory} from '../../../../support/FakeWebSocket';
import {
  jsonResponse,
  locateResponse,
  measurement,
  silentLogger,
} from '../../../../support/fixtures/ndt7';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const tick = (ms = 0) => jest.advanceTimersByTimeAsync(ms);

const hangingFetch = () =>
  jest.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new Error('aborted')),
        );
      }),
  );

function setup(
  fetchFn: jest.Mock = jest
    .fn()
    .mockResolvedValue(jsonResponse(locateResponse)),
  downloadMode?: 'arraybuffer' | 'blob',
  uploadWindowBytes?: number,
) {
  const factory = fakeSocketFactory();
  const engine = new Ndt7Engine({
    createSocket: factory.create,
    fetch: fetchFn as unknown as typeof fetch,
    now: () => Date.now(),
    clientVersion: '0.1.0',
    downloadMode,
    uploadWindowBytes,
    logger: silentLogger,
  });
  const events: EngineEvent[] = [];
  const controller = new AbortController();
  const run = () => {
    const promise = engine.run({
      signal: controller.signal,
      onEvent: (e) => events.push(e),
    });
    // Captured up front so a rejection is never reported as unhandled.
    const settled = promise.catch((error: unknown) => error);
    return {promise, settled};
  };
  return {...factory, engine, events, controller, run, fetchFn};
}

type Setup = ReturnType<typeof setup>;

/** Opens the download socket and lets the server finish download normally. */
async function finishDownload(s: Setup, index = 0) {
  const down = s.sockets[index];
  down.open();
  await tick();
  down.receive(new ArrayBuffer(125_000));
  down.receive(measurement({MinRTT: 20_000, RTT: 30_000}));
  await tick(1_000);
  down.serverClose(1000);
  await tick();
}

/** Opens the upload socket at index and makes it fail like Vega's backed-up socket. */
async function failUpload(s: Setup, index: number) {
  s.sockets[index].open();
  await tick();
  s.sockets[index].fail();
  await tick();
}

/** Drives a full successful run starting at the given download socket. */
async function completeRun(s: Setup, index = 0) {
  await finishDownload(s, index);
  await finishUpload(s, index + 1);
}

async function finishUpload(s: Setup, index: number) {
  const up = s.sockets[index];
  up.open();
  await tick();
  up.receive(measurement({BytesReceived: 1_000_000, ElapsedTime: 1_000_000}));
  await tick(10_000);
}

describe('Ndt7Engine', () => {
  it('runs locate, download and upload and resolves the result', async () => {
    const s = setup();
    const {promise} = s.run();
    await tick();
    await completeRun(s);
    await expect(promise).resolves.toEqual({
      downloadBps: 1_000_000,
      uploadBps: 8_000_000,
      idleLatencyMs: 20,
      loadedLatencyMs: 30,
      server: {
        machine: 'mlab1-tst01.mlab-sandbox.measurement-lab.example',
        city: 'Testville 1',
        country: 'ZZ',
      },
      finishedAt: Date.now(),
      uploadWindowBytes: 128 * 1024,
    });
    expect(s.create.mock.calls.map((c) => c[0])).toEqual([
      'wss://ndt-1.example/ndt/v7/download?access_token=REDACTED',
      'wss://ndt-1.example/ndt/v7/upload?access_token=REDACTED',
    ]);
    expect(s.sockets[0].binaryType).toBe('arraybuffer');
    expect(s.sockets[1].binaryType).toBe('arraybuffer');
    const phases = s.events.flatMap((e) =>
      e.type === 'phase' ? [e.phase] : [],
    );
    expect(phases).toEqual(['locating', 'latency', 'download', 'upload']);
    expect(s.events).toContainEqual({
      type: 'server',
      server: expect.objectContaining({machine: expect.any(String)}),
    });
  });

  it('uses blob mode for download when configured', async () => {
    const s = setup(undefined, 'blob');
    s.run();
    await tick();
    expect(s.sockets[0].binaryType).toBe('blob');
    s.controller.abort();
    await tick();
  });

  it('falls back to the next server when connecting fails', async () => {
    const s = setup();
    const {promise} = s.run();
    await tick();
    s.sockets[0].fail();
    await tick();
    expect(s.create.mock.calls[1][0]).toBe(
      'wss://ndt-2.example/ndt/v7/download?access_token=REDACTED',
    );
    await completeRun(s, 1);
    await expect(promise).resolves.toMatchObject({
      server: {machine: 'mlab2-tst02.mlab-sandbox.measurement-lab.example'},
    });
  });

  it('falls back on connect timeout', async () => {
    const s = setup();
    s.run();
    await tick();
    await tick(5_000);
    expect(s.sockets).toHaveLength(2);
    s.controller.abort();
    await tick();
  });

  it('rejects connect_failed after 3 failed servers', async () => {
    const s = setup();
    const {settled} = s.run();
    await tick();
    for (let i = 0; i < 3; i++) {
      s.sockets[i].fail();
      await tick();
    }
    expect(await settled).toMatchObject({code: 'connect_failed'});
    expect(s.sockets).toHaveLength(3);
  });

  it('rejects connect_failed when the upload socket fails, without fallback', async () => {
    const s = setup();
    const {settled} = s.run();
    await tick();
    await finishDownload(s);
    s.sockets[1].fail();
    await tick();
    expect(await settled).toMatchObject({code: 'connect_failed'});
    expect(s.sockets).toHaveLength(2);
  });

  it('reports the upload window it used', async () => {
    const s = setup();
    const {promise} = s.run();
    await tick();
    await completeRun(s);
    await expect(promise).resolves.toMatchObject({
      uploadWindowBytes: 128 * 1024,
    });
  });

  it('retries upload with the next smaller window when it fails', async () => {
    const s = setup(undefined, undefined, 256 * 1024);
    const {promise} = s.run();
    await tick();
    await finishDownload(s);
    await failUpload(s, 1);
    expect(s.create.mock.calls[2][0]).toBe(
      'wss://ndt-1.example/ndt/v7/upload?access_token=REDACTED',
    );
    await failUpload(s, 2);
    await finishUpload(s, 3);
    await expect(promise).resolves.toMatchObject({
      uploadBps: 8_000_000,
      uploadWindowBytes: 64 * 1024,
    });
  });

  it('rejects network_lost once the smallest window also fails', async () => {
    const s = setup(undefined, undefined, 64 * 1024);
    const {settled} = s.run();
    await tick();
    await finishDownload(s);
    await failUpload(s, 1);
    await failUpload(s, 2);
    expect(await settled).toMatchObject({code: 'network_lost'});
    // 64 KiB, then 32 KiB: no third upload socket.
    expect(s.sockets).toHaveLength(3);
  });

  it('stops retrying when a retry cannot connect', async () => {
    const s = setup();
    const {settled} = s.run();
    await tick();
    await finishDownload(s);
    await failUpload(s, 1);
    s.sockets[2].fail();
    await tick();
    expect(await settled).toMatchObject({code: 'connect_failed'});
    expect(s.sockets).toHaveLength(3);
  });

  it('rejects locate errors as-is', async () => {
    const s = setup(jest.fn().mockResolvedValue(jsonResponse({results: []})));
    await expect(s.run().promise).rejects.toMatchObject({code: 'no_servers'});
  });

  it('rejects aborted when aborted during locate', async () => {
    const s = setup(hangingFetch());
    const {promise} = s.run();
    s.controller.abort();
    await expect(promise).rejects.toMatchObject({code: 'aborted'});
  });

  test.each([
    ['connect', 0],
    ['download', 1],
    ['upload', 2],
  ])(
    'rejects aborted and closes the socket when aborted during %s',
    async (_phase, step) => {
      const s = setup();
      const {settled} = s.run();
      await tick();
      if (step >= 1) {
        s.sockets[0].open();
        await tick();
      }
      if (step >= 2) {
        s.sockets[0].receive(measurement({MinRTT: 20_000, RTT: 30_000}));
        s.sockets[0].serverClose(1000);
        await tick();
        s.sockets[1].open();
        await tick();
      }
      s.controller.abort();
      expect(await settled).toMatchObject({code: 'aborted'});
      const last = s.sockets[s.sockets.length - 1];
      expect(last.closeCalls.length).toBeGreaterThan(0);
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it('rejects a second run while one is in progress', async () => {
    const s = setup(hangingFetch());
    s.run();
    await expect(s.run().promise).rejects.toThrow('run already in progress');
    s.controller.abort();
    await tick();
  });

  it('can run again after a failed run', async () => {
    const s = setup();
    s.fetchFn.mockResolvedValueOnce(jsonResponse({results: []}));
    await expect(s.run().promise).rejects.toMatchObject({code: 'no_servers'});
    const {promise} = s.run();
    await tick();
    await completeRun(s);
    await expect(promise).resolves.toMatchObject({uploadBps: 8_000_000});
  });

  it('ignores an abort after the run resolved', async () => {
    const s = setup();
    const {promise} = s.run();
    await tick();
    await completeRun(s);
    await promise;
    const closes = s.sockets.map((x) => x.closeCalls.length);
    expect(() => s.controller.abort()).not.toThrow();
    expect(s.sockets.map((x) => x.closeCalls.length)).toEqual(closes);
  });
});
