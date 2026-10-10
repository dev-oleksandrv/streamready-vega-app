import {
  isSpeedTestError,
  NativeNdt7Engine,
  type EngineEvent,
} from '~/modules/speedtest';
import {fakeNdt7Native} from '../../../../support/FakeNdt7Native';
import {
  jsonResponse,
  locateEntry,
  locateResponse,
  measurement,
  silentLogger,
} from '../../../../support/fixtures/ndt7';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setup(body: unknown = locateResponse) {
  const fake = fakeNdt7Native();
  const engine = new NativeNdt7Engine({
    native: fake.native,
    events: fake.events,
    fetch: jest
      .fn()
      .mockResolvedValue(jsonResponse(body)) as unknown as typeof fetch,
    now: () => 1_000,
    clientVersion: '0.1.0',
    logger: silentLogger,
  });
  const events: EngineEvent[] = [];
  const controller = new AbortController();
  const promise = engine.run({
    signal: controller.signal,
    onEvent: (e) => events.push(e),
  });
  const settled = promise.catch((error: unknown) => error);
  const run = (index: number) => fake.started[index].runId;
  return {fake, events, controller, promise, settled, run};
}

const downloadDone = {
  bytes: 1_000_000,
  elapsedMs: 1000,
  measurements: [measurement({MinRTT: 10_000, RTT: 40_000})],
};

describe('NativeNdt7Engine', () => {
  it('runs download then upload over plain ws urls and computes the result', async () => {
    const s = setup();
    await flush();
    expect(s.fake.started[0]).toMatchObject({
      direction: 'download',
      url: 'ws://ndt-1.example/ndt/v7/download?access_token=REDACTED',
    });
    s.fake.progress(s.run(0), {
      bytes: 500_000,
      elapsedMs: 500,
      measurements: [measurement({MinRTT: 12_000, RTT: 20_000})],
    });
    s.fake.done(s.run(0), downloadDone);
    await flush();
    expect(s.fake.started[1]).toMatchObject({
      direction: 'upload',
      url: 'ws://ndt-1.example/ndt/v7/upload?access_token=REDACTED',
    });
    s.fake.progress(s.run(1), {
      measurements: [
        measurement({BytesReceived: 250_000, ElapsedTime: 1_000_000}),
      ],
    });
    s.fake.done(s.run(1), {
      measurements: [
        measurement({BytesReceived: 500_000, ElapsedTime: 1_000_000}),
      ],
    });

    await expect(s.promise).resolves.toEqual({
      downloadBps: 8_000_000,
      uploadBps: 4_000_000,
      idleLatencyMs: 10,
      loadedLatencyMs: 30,
      server: {
        machine: 'mlab1-tst01.mlab-sandbox.measurement-lab.example',
        city: 'Testville 1',
        country: 'ZZ',
      },
      finishedAt: 1_000,
      engineId: 'ndt7-native',
    });
    expect(
      s.events.flatMap((e) => (e.type === 'phase' ? [e.phase] : [])),
    ).toEqual(['locating', 'latency', 'download', 'upload']);
    expect(s.events).toContainEqual({
      type: 'throughput',
      direction: 'download',
      bps: 8_000_000,
      elapsedMs: 500,
    });
    expect(s.events).toContainEqual({
      type: 'throughput',
      direction: 'upload',
      bps: 2_000_000,
      elapsedMs: 0,
    });
  });

  it('uses measurements carried by done', async () => {
    const s = setup();
    await flush();
    s.fake.done(s.run(0), downloadDone);
    await flush();
    s.fake.done(s.run(1), {
      measurements: [
        measurement({BytesReceived: 500_000, ElapsedTime: 1_000_000}),
      ],
    });
    await expect(s.promise).resolves.toMatchObject({
      idleLatencyMs: 10,
      uploadBps: 4_000_000,
    });
  });

  it('tries the next server when a download cannot connect', async () => {
    const s = setup();
    await flush();
    s.fake.done(s.run(0), {error: 'connect_failed'});
    await flush();
    expect(s.fake.started[1]).toMatchObject({
      direction: 'download',
      url: 'ws://ndt-2.example/ndt/v7/download?access_token=REDACTED',
    });
    s.fake.done(s.run(1), downloadDone);
    await flush();
    s.fake.done(s.run(2), {
      measurements: [measurement({BytesReceived: 1, ElapsedTime: 1})],
    });
    await expect(s.promise).resolves.toMatchObject({
      server: {machine: 'mlab2-tst02.mlab-sandbox.measurement-lab.example'},
    });
  });

  it('gives up with connect_failed after three servers', async () => {
    const s = setup();
    for (let i = 0; i < 3; i++) {
      await flush();
      s.fake.done(s.run(i), {error: 'connect_failed'});
    }
    const error = await s.settled;
    expect(isSpeedTestError(error) && error.code).toBe('connect_failed');
    expect(s.fake.started).toHaveLength(3);
  });

  it('reports no_servers when Locate has no plain ws urls', async () => {
    const entry = locateEntry(1);
    const urls: Record<string, string> = {...entry.urls};
    delete urls['ws:///ndt/v7/download'];
    delete urls['ws:///ndt/v7/upload'];
    const s = setup({results: [{...entry, urls}]});
    const error = await s.settled;
    expect(isSpeedTestError(error) && error.code).toBe('no_servers');
  });

  it('does not retry another server once download data flowed', async () => {
    const s = setup();
    await flush();
    s.fake.progress(s.run(0), {bytes: 10, elapsedMs: 10});
    s.fake.done(s.run(0), {error: 'network_lost'});
    const error = await s.settled;
    expect(isSpeedTestError(error) && error.code).toBe('network_lost');
    expect(s.fake.started).toHaveLength(1);
  });

  it('rejects download without MinRTT as protocol', async () => {
    const s = setup();
    await flush();
    s.fake.done(s.run(0), {bytes: 10, elapsedMs: 10});
    const error = await s.settled;
    expect(isSpeedTestError(error) && error.code).toBe('protocol');
  });

  it('rejects upload without a server rate as protocol', async () => {
    const s = setup();
    await flush();
    s.fake.done(s.run(0), downloadDone);
    await flush();
    s.fake.done(s.run(1));
    const error = await s.settled;
    expect(isSpeedTestError(error) && error.code).toBe('protocol');
  });

  it('aborts mid-download and cancels the native run', async () => {
    const s = setup();
    await flush();
    s.fake.progress(s.run(0));
    s.controller.abort();
    const error = await s.settled;
    expect(isSpeedTestError(error) && error.code).toBe('aborted');
    expect(s.fake.cancelled).toEqual([s.run(0)]);
  });

  it('never exposes signed urls in errors', async () => {
    const s = setup();
    await flush();
    s.fake.progress(s.run(0));
    s.fake.done(s.run(0), {error: 'network_lost'});
    const error = await s.settled;
    expect(String(error)).not.toContain('access_token');
  });
});
