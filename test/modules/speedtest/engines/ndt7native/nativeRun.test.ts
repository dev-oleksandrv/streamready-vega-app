import {isSpeedTestError} from '~/modules/speedtest';
import type {NativeRunEvent} from '~/modules/speedtest/engines/ndt7native/nativeEvents';
import {
  runNative,
  type NativeRunOptions,
} from '~/modules/speedtest/engines/ndt7native/nativeRun';
import {fakeNdt7Native} from '../../../../support/FakeNdt7Native';

const URL = 'ws://ndt-1.example/ndt/v7/download?access_token=REDACTED';

function setup(onProgress: NativeRunOptions['onProgress'] = () => {}) {
  const fake = fakeNdt7Native();
  const controller = new AbortController();
  const promise = runNative(fake.native, fake.events, 'download', URL, {
    signal: controller.signal,
    onProgress,
  });
  const settled = promise.catch((error: unknown) => error);
  const runId = fake.started[0]?.runId ?? -1;
  return {fake, controller, promise, settled, runId};
}

describe('runNative', () => {
  it('starts the subtest and resolves with the done event', async () => {
    const seen: NativeRunEvent[] = [];
    const {fake, promise, runId} = setup((e) => seen.push(e));
    expect(fake.started).toEqual([{runId, direction: 'download', url: URL}]);
    fake.progress(runId, {bytes: 10, elapsedMs: 250});
    fake.done(runId, {bytes: 20, elapsedMs: 500, measurements: ['{}']});
    await expect(promise).resolves.toMatchObject({
      type: 'done',
      bytes: 20,
      measurements: ['{}'],
    });
    expect(seen.map((e) => e.bytes)).toEqual([10]);
    expect(fake.listenerCount()).toBe(0);
  });

  it('ignores stale seq and events after done', async () => {
    const seen: number[] = [];
    const {fake, promise, runId} = setup((e) => seen.push(e.seq));
    fake.progress(runId);
    fake.emitRaw({
      runId,
      seq: 1,
      type: 'progress',
      bytes: 0,
      elapsedMs: 0,
      measurements: [],
    });
    fake.done(runId);
    fake.progress(runId);
    await promise;
    expect(seen).toEqual([1]);
  });

  it('ignores events of another run', async () => {
    const seen: number[] = [];
    const {fake, promise, runId} = setup((e) => seen.push(e.runId));
    fake.progress(runId + 100);
    fake.done(runId + 100, {error: 'aborted'});
    fake.done(runId);
    await expect(promise).resolves.toMatchObject({runId});
    expect(seen).toEqual([]);
  });

  it('uses a new runId for every run', () => {
    const first = setup();
    const second = setup();
    expect(second.runId).not.toBe(first.runId);
  });

  it.each(['connect_failed', 'network_lost', 'timeout', 'protocol'])(
    'rejects with the native %s code',
    async (code) => {
      const {fake, settled, runId} = setup();
      fake.done(runId, {error: code});
      const error = await settled;
      expect(isSpeedTestError(error) && error.code).toBe(code);
      expect(fake.cancelled).toEqual([]);
    },
  );

  it('rejects malformed payloads as protocol and cancels the worker', async () => {
    const {fake, settled, runId} = setup();
    fake.emitRaw({runId, seq: 1, type: 'progress'});
    const error = await settled;
    expect(isSpeedTestError(error) && error.code).toBe('protocol');
    expect(fake.cancelled).toEqual([runId]);
  });

  it('maps a throwing start to connect_failed', async () => {
    const fake = fakeNdt7Native();
    fake.failStartWith(new Error('undefined is not a function'));
    const error = await runNative(fake.native, fake.events, 'upload', URL, {
      signal: new AbortController().signal,
      onProgress: () => {},
    }).catch((e: unknown) => e);
    expect(isSpeedTestError(error) && error.code).toBe('connect_failed');
    expect(fake.listenerCount()).toBe(0);
  });

  it('aborts before any event: rejects at once, cancels, ignores the late done', async () => {
    const {fake, controller, settled, runId} = setup();
    controller.abort();
    const error = await settled;
    expect(isSpeedTestError(error) && error.code).toBe('aborted');
    expect(fake.cancelled).toEqual([runId]);
    expect(fake.listenerCount()).toBe(0);
    expect(() => fake.done(runId, {error: 'aborted'})).not.toThrow();
  });

  it('rejects an already aborted signal without starting', async () => {
    const fake = fakeNdt7Native();
    const controller = new AbortController();
    controller.abort();
    const error = await runNative(fake.native, fake.events, 'download', URL, {
      signal: controller.signal,
      onProgress: () => {},
    }).catch((e: unknown) => e);
    expect(isSpeedTestError(error) && error.code).toBe('aborted');
    expect(fake.started).toEqual([]);
  });

  it('turns an onProgress failure into a rejection and cancels', async () => {
    const {fake, settled, runId} = setup(() => {
      throw new Error('bad measurement');
    });
    fake.progress(runId);
    const error = await settled;
    expect(isSpeedTestError(error) && error.code).toBe('protocol');
    expect(fake.cancelled).toEqual([runId]);
  });

  it('never puts the url into errors', async () => {
    const {fake, settled, runId} = setup();
    fake.done(runId, {error: 'network_lost'});
    const error = await settled;
    expect(String(error)).not.toContain('access_token');
  });
});
