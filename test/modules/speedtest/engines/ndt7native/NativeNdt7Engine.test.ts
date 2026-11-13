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

function setup(body: unknown = locateResponse, detectTunnel?: () => boolean) {
  const fake = fakeNdt7Native();
  const engine = new NativeNdt7Engine({
    detectTunnel,
    native: fake.native,
    events: fake.events,
    fetch: jest
      .fn()
      .mockResolvedValue(jsonResponse(body)) as unknown as typeof fetch,
    now: () => 1_000,
    clientVersion: '1.0.0',
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
  const runToEnd = async (s: ReturnType<typeof setup>) => {
    s.fake.progress(s.run(0), {
      bytes: 500_000,
      elapsedMs: 500,
      measurements: [measurement({MinRTT: 1_000, RTT: 1_000})],
      client: {minRttUs: 30_000, rttUs: 40_000},
    });
    s.fake.done(s.run(0), {
      ...downloadDone,
      measurements: [measurement({MinRTT: 1_000, RTT: 1_000})],
      client: {minRttUs: 28_000, rttUs: 50_000},
    });
    await flush();
    s.fake.done(s.run(1), {
      measurements: [
        measurement({BytesReceived: 500_000, ElapsedTime: 1_000_000}),
      ],
    });
    return s.promise;
  };

  it('uses the device rtt when a vpn is connected', async () => {
    const s = setup(undefined, () => true);
    await flush();
    await expect(runToEnd(s)).resolves.toMatchObject({
      idleLatencyMs: 28,
      loadedLatencyMs: 45,
      latencySource: 'device',
    });
    expect(s.events).toContainEqual({
      type: 'latency',
      idleMs: 30,
      loadedMs: 40,
    });
  });

  it('keeps server rtt without a vpn even when client samples arrive', async () => {
    const s = setup(undefined, () => false);
    await flush();
    await expect(runToEnd(s)).resolves.toMatchObject({
      idleLatencyMs: 1,
      loadedLatencyMs: 1,
      latencySource: 'server',
    });
  });

  it('falls back to server rtt when a vpn run gets no client samples', async () => {
    const s = setup(undefined, () => true);
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
      loadedLatencyMs: 40,
      latencySource: 'server',
    });
  });

  it('under a vpn, shows no server latency before the first device sample', async () => {
    const s = setup(undefined, () => true);
    await flush();
    s.fake.progress(s.run(0), {
      bytes: 100_000,
      elapsedMs: 250,
      measurements: [measurement({MinRTT: 1_000, RTT: 1_000})],
    });
    expect(s.events.filter((e) => e.type === 'latency')).toEqual([]);
    await runToEnd(s);
    expect(s.events).not.toContainEqual(
      expect.objectContaining({type: 'latency', idleMs: 1}),
    );
  });

  describe('jitter', () => {
    const finishUpload = async (s: ReturnType<typeof setup>) => {
      await flush();
      s.fake.done(s.run(1), {
        measurements: [measurement({BytesReceived: 1, ElapsedTime: 1})],
      });
      return s.promise;
    };

    it('is computed from server rtt samples in elapsed order', async () => {
      const s = setup();
      await flush();
      s.fake.progress(s.run(0), {
        bytes: 1000,
        elapsedMs: 250,
        measurements: [
          measurement({MinRTT: 5_000, RTT: 10_000, ElapsedTime: 300_000}),
          measurement({RTT: 20_000, ElapsedTime: 100_000}),
        ],
      });
      s.fake.done(s.run(0), {
        ...downloadDone,
        measurements: [measurement({RTT: 10_000, ElapsedTime: 200_000})],
      });
      const result = await finishUpload(s);
      // time order: 20, 10, 10 -> (10 + 0) / 2
      expect(result.jitterMs).toBe(5);
      expect(s.events.map((e) => e.type)).not.toContain('jitter');
    });

    it('under a vpn uses device samples ordered by event elapsedMs', async () => {
      const s = setup(undefined, () => true);
      await flush();
      const runId = s.run(0);
      const progress = (seq: number, elapsedMs: number, rttUs: number) => ({
        runId,
        seq,
        type: 'progress',
        bytes: seq * 1000,
        elapsedMs,
        measurements: [measurement({MinRTT: 1_000, RTT: 1_000})],
        clientMinRttUs: 10_000,
        clientRttUs: rttUs,
      });
      s.fake.emitRaw(progress(2, 500, 10_000));
      s.fake.emitRaw(progress(3, 750, 16_000));
      // arrives late, but happened first
      s.fake.emitRaw(progress(1, 250, 20_000));
      s.fake.emitRaw({
        runId,
        seq: 4,
        type: 'done',
        bytes: 4000,
        elapsedMs: 1000,
        measurements: [],
      });
      const result = await finishUpload(s);
      expect(result.latencySource).toBe('device');
      // time order: 20, 10, 16 -> (10 + 6) / 2
      expect(result.jitterMs).toBe(8);
    });

    it('is omitted with fewer than 3 samples', async () => {
      const s = setup();
      await flush();
      s.fake.done(s.run(0), {
        ...downloadDone,
        measurements: [
          measurement({MinRTT: 1_000, RTT: 1_000, ElapsedTime: 100_000}),
          measurement({RTT: 2_000, ElapsedTime: 200_000}),
        ],
      });
      const result = await finishUpload(s);
      expect('jitterMs' in result).toBe(false);
    });
  });

  it('asks about the vpn once per run, at the start', async () => {
    const detectTunnel = jest.fn(() => false);
    const s = setup(undefined, detectTunnel);
    await flush();
    await runToEnd(s);
    expect(detectTunnel).toHaveBeenCalledTimes(1);
  });

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
      latencySource: 'server',
      server: {
        machine: 'mlab1-tst01.mlab-sandbox.measurement-lab.example',
        city: 'Testville 1',
        country: 'ZZ',
      },
      finishedAt: 1_000,
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

  it('accepts a download that ended before any data', async () => {
    const s = setup();
    await flush();
    s.fake.done(s.run(0), {
      measurements: [measurement({MinRTT: 10_000})],
    });
    await flush();
    s.fake.done(s.run(1), {
      measurements: [measurement({BytesReceived: 1, ElapsedTime: 1})],
    });
    await expect(s.promise).resolves.toMatchObject({
      downloadBps: 0,
      idleLatencyMs: 10,
      loadedLatencyMs: 10,
    });
  });

  it('keeps measurements of late progress events but not their throughput', async () => {
    const s = setup();
    await flush();
    const runId = s.run(0);
    const progress = (seq: number, rtt: number) => ({
      runId,
      seq,
      type: 'progress',
      bytes: seq * 1000,
      elapsedMs: seq * 250,
      measurements: [measurement({MinRTT: 10_000, RTT: rtt})],
    });
    s.fake.emitRaw(progress(2, 20_000));
    s.fake.emitRaw(progress(1, 60_000));
    s.fake.emitRaw({
      runId,
      seq: 3,
      type: 'done',
      bytes: 3000,
      elapsedMs: 750,
      measurements: [measurement({RTT: 40_000})],
    });
    await flush();
    s.fake.done(s.run(1), {
      measurements: [measurement({BytesReceived: 1, ElapsedTime: 1})],
    });
    await expect(s.promise).resolves.toMatchObject({loadedLatencyMs: 40});
    const downloadElapsed = s.events.flatMap((e) =>
      e.type === 'throughput' && e.direction === 'download'
        ? [e.elapsedMs]
        : [],
    );
    expect(downloadElapsed).toEqual([500]);
  });

  it('keeps the newest upload rate when an older measurement arrives late', async () => {
    const s = setup();
    await flush();
    s.fake.done(s.run(0), downloadDone);
    await flush();
    const runId = s.run(1);
    const upload = (seq: number, bytes: number, elapsedUs: number) => ({
      runId,
      seq,
      type: 'progress',
      bytes: 0,
      elapsedMs: 0,
      measurements: [
        measurement({BytesReceived: bytes, ElapsedTime: elapsedUs}),
      ],
    });
    s.fake.emitRaw(upload(2, 1_000_000, 2_000_000));
    s.fake.emitRaw(upload(1, 300_000, 1_000_000));
    s.fake.emitRaw({...upload(3, 0, 0), type: 'done', measurements: []});
    await expect(s.promise).resolves.toMatchObject({uploadBps: 4_000_000});
    const uploadBps = s.events.flatMap((e) =>
      e.type === 'throughput' && e.direction === 'upload' ? [e.bps] : [],
    );
    expect(uploadBps).toEqual([4_000_000]);
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

  it('reports no_servers when Locate has no ws urls', async () => {
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
