import {createSessionStore, type EngineEvent} from '~/modules/speedtest';
import {MAX_BARS} from '~/modules/speedtest/store/sessionStore';
import {createFakeEngine, TEST_RESULT} from '../../../support/fakeEngine';

const NOW = 1_000_000;
let clock = NOW;

function setup() {
  clock = NOW;
  const fake = createFakeEngine();
  const store = createSessionStore({
    createEngine: fake.createEngine,
    now: () => clock,
    cooldownMs: 30_000,
    flushIntervalMs: 250,
  });
  return {store, fake};
}

const download = (bps: number, elapsedMs: number): EngineEvent => ({
  type: 'throughput',
  direction: 'download',
  bps,
  elapsedMs,
});
const upload = (bps: number, elapsedMs: number): EngineEvent => ({
  type: 'throughput',
  direction: 'upload',
  bps,
  elapsedMs,
});

/** Lets the engine promise's then/catch run (no act(): it leaves a fake timer behind). */
const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('sessionStore', () => {
  it('starts idle with no cooldown', () => {
    const state = createSessionStore().getState();
    expect(state.status).toBe('idle');
    expect(state.cooldownUntil).toBeUndefined();
    expect(state.bars).toEqual([]);
  });

  it('startCooldown sets cooldownUntil = now + duration', () => {
    const store = createSessionStore();
    store.getState().startCooldown(1_000, 30_000);
    expect(store.getState().cooldownUntil).toBe(31_000);
  });

  it('start runs the engine once and is ignored while running', () => {
    const {store, fake} = setup();
    store.getState().start();
    store.getState().start();
    expect(store.getState().status).toBe('running');
    expect(fake.createEngine).toHaveBeenCalledTimes(1);
  });

  it('buffers events and applies them once per flush', () => {
    const {store, fake} = setup();
    store.getState().start();
    const updates = jest.fn();
    store.subscribe(updates);
    const run = fake.last();
    run.emit({type: 'phase', phase: 'locating'});
    run.emit({type: 'phase', phase: 'latency'});
    run.emit({type: 'server', server: TEST_RESULT.server});
    run.emit({type: 'phase', phase: 'download'});
    run.emit(download(10e6, 500));
    run.emit(download(20e6, 1_000));
    run.emit({type: 'latency', idleMs: 14});
    expect(updates).not.toHaveBeenCalled();
    jest.advanceTimersByTime(250);
    expect(updates).toHaveBeenCalledTimes(1);
    const s = store.getState();
    expect(s.phase).toBe('download');
    expect(s.server).toEqual(TEST_RESULT.server);
    expect(s.liveBps).toBe(20e6);
    expect(s.idleMs).toBe(14);
    expect(s.progress).toEqual({ping: 1, download: 0.1, upload: 0});
  });

  it('does not update the store when nothing changed', () => {
    const {store} = setup();
    store.getState().start();
    const updates = jest.fn();
    store.subscribe(updates);
    jest.advanceTimersByTime(1_000);
    expect(updates).not.toHaveBeenCalled();
  });

  it('adds one bar per flush while measuring, so the chart is time-based', () => {
    const {store, fake} = setup();
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'download'});
    jest.advanceTimersByTime(250); // no value yet: no bar
    run.emit(download(10e6, 250));
    run.emit(download(30e6, 500));
    jest.advanceTimersByTime(250);
    jest.advanceTimersByTime(250); // no new sample: repeats the last value
    run.emit({type: 'phase', phase: 'upload'});
    jest.advanceTimersByTime(250); // upload has no value yet: no bar
    run.emit(upload(5e6, 400));
    jest.advanceTimersByTime(250);
    const s = store.getState();
    expect(s.bars).toEqual([
      {direction: 'download', bps: 30e6},
      {direction: 'download', bps: 30e6},
      {direction: 'upload', bps: 5e6},
    ]);
    expect(s.peakBps).toBe(30e6);
  });

  it('gives a sparse upload as many bars as a dense download of the same length', () => {
    const {store, fake} = setup();
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'download'});
    for (let t = 250; t <= 2_000; t += 250) {
      run.emit(download(50e6, t));
      jest.advanceTimersByTime(250);
    }
    run.emit({type: 'phase', phase: 'upload'});
    // Server measurements arrive in batches every ~500 ms while sends block.
    for (let t = 250; t <= 2_000; t += 250) {
      if (t % 500 === 0) {
        run.emit(upload(10e6, t));
      }
      jest.advanceTimersByTime(250);
    }
    const bars = store.getState().bars;
    const count = (direction: string) =>
      bars.filter((bar) => bar.direction === direction).length;
    expect(count('download')).toBe(8);
    expect(count('upload')).toBe(7);
  });

  it('ignores a sample whose direction is not the current phase', () => {
    const {store, fake} = setup();
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'download'});
    run.emit(upload(5e6, 400));
    jest.advanceTimersByTime(250);
    expect(store.getState().liveBps).toBeUndefined();
    expect(store.getState().bars).toEqual([]);
  });

  it('clears the live value when upload starts', () => {
    const {store, fake} = setup();
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'download'});
    run.emit(download(10e6, 9_000));
    run.emit({type: 'phase', phase: 'upload'});
    jest.advanceTimersByTime(250);
    expect(store.getState().liveBps).toBeUndefined();
    expect(store.getState().progress).toEqual({
      ping: 1,
      download: 1,
      upload: 0,
    });
  });

  it('stops adding bars once the subtest has run its full length', () => {
    const {store, fake} = setup();
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'upload'});
    run.emit(upload(10e6, 10_000));
    jest.advanceTimersByTime(250 * 4); // closing handshake: no new data
    expect(store.getState().bars).toEqual([]);
  });

  it('stops repeating the last value after a second without samples', () => {
    const {store, fake} = setup();
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'download'});
    run.emit(download(10e6, 1_000));
    jest.advanceTimersByTime(250 * 8);
    expect(store.getState().bars).toHaveLength(4);
  });

  it('settling does not add an extra bar', async () => {
    const {store, fake} = setup();
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'upload'});
    run.emit(upload(20e6, 5_000));
    jest.advanceTimersByTime(250);
    run.resolve();
    await settle();
    expect(store.getState().bars).toHaveLength(1);
  });

  it(`caps the chart at ${MAX_BARS} bars`, () => {
    const {store, fake} = setup();
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'download'});
    for (let i = 0; i < MAX_BARS + 10; i++) {
      run.emit(download(1e6 + i, 100));
      jest.advanceTimersByTime(250);
    }
    expect(store.getState().bars).toHaveLength(MAX_BARS);
  });

  it('success: done, final values, full progress, cooldown, timer stopped', async () => {
    const {store, fake} = setup();
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'upload'});
    run.emit(upload(20e6, 9_000));
    jest.advanceTimersByTime(250);
    run.resolve();
    await settle();
    const s = store.getState();
    expect(s.status).toBe('done');
    expect(s.result).toEqual(TEST_RESULT);
    expect(s.liveBps).toBe(TEST_RESULT.uploadBps);
    expect(s.idleMs).toBe(TEST_RESULT.idleLatencyMs);
    expect(s.loadedMs).toBe(TEST_RESULT.loadedLatencyMs);
    expect(s.progress).toEqual({ping: 1, download: 1, upload: 1});
    expect(s.bars).toEqual([{direction: 'upload', bps: 20e6}]);
    expect(s.cooldownUntil).toBe(NOW + 30_000);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('success ends on the upload phase even if no phase event arrived', async () => {
    const {store, fake} = setup();
    store.getState().start();
    fake.last().resolve();
    await settle();
    expect(store.getState().phase).toBe('upload');
  });

  it.each([
    ['network_lost', 'connectionLost'],
    ['locate_failed', 'serversUnavailable'],
    ['no_servers', 'serversUnavailable'],
    ['connect_failed', 'interrupted'],
    ['timeout', 'interrupted'],
    ['protocol', 'interrupted'],
  ] as const)(
    'failure %s → %s, values frozen, no cooldown',
    async (code, variant) => {
      const {store, fake} = setup();
      store.getState().start();
      const run = fake.last();
      run.emit({type: 'phase', phase: 'download'});
      run.emit(download(10e6, 300));
      jest.advanceTimersByTime(250);
      run.reject(code);
      await settle();
      const s = store.getState();
      expect(s.status).toBe('failed');
      expect(s.error).toBe(variant);
      expect(s.liveBps).toBe(10e6);
      expect(s.bars).toHaveLength(1);
      expect(s.cooldownUntil).toBeUndefined();
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it('a non-SpeedTestError rejection shows interrupted', async () => {
    const store = createSessionStore({
      createEngine: () => ({
        id: 'broken',
        run: () => Promise.reject(new Error('boom')),
      }),
    });
    store.getState().start();
    await settle();
    expect(store.getState().error).toBe('interrupted');
  });

  it('a synchronous throw from the engine fails the run without leaking the timer', async () => {
    const store = createSessionStore({
      createEngine: () => {
        throw new Error('no emitter');
      },
    });
    expect(() => store.getState().start()).not.toThrow();
    await settle();
    expect(store.getState().status).toBe('failed');
    expect(store.getState().error).toBe('interrupted');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('an aborted rejection the store did not cause shows interrupted', async () => {
    const {store, fake} = setup();
    store.getState().start();
    fake.last().reject('aborted');
    await settle();
    expect(store.getState().status).toBe('failed');
    expect(store.getState().error).toBe('interrupted');
  });

  it('keeps the progress object while a full step stays full', () => {
    const {store, fake} = setup();
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'download'});
    run.emit(download(10e6, 11_000));
    jest.advanceTimersByTime(250);
    const before = store.getState().progress;
    run.emit(download(12e6, 12_000));
    jest.advanceTimersByTime(250);
    expect(store.getState().progress).toBe(before);
  });

  it('stop aborts silently and resets to idle', async () => {
    const {store, fake} = setup();
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'download'});
    jest.advanceTimersByTime(250);
    store.getState().stop();
    expect(run.signal.aborted).toBe(true);
    await settle();
    const s = store.getState();
    expect(s.status).toBe('idle');
    expect(s.error).toBeUndefined();
    expect(s.phase).toBeUndefined();
    expect(s.cooldownUntil).toBe(NOW + 30_000);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('drops events and settles from a stopped run', async () => {
    const {store, fake} = setup();
    store.getState().start();
    const first = fake.last();
    store.getState().stop();
    store.getState().start();
    clock = NOW + 5_000;
    first.emit({type: 'phase', phase: 'upload'});
    first.resolve();
    await settle();
    jest.advanceTimersByTime(250);
    expect(store.getState().status).toBe('running');
    expect(store.getState().phase).toBeUndefined();
    // Only stop()'s cooldown: the stale success did not set a new one.
    expect(store.getState().cooldownUntil).toBe(NOW + 30_000);
  });

  it('fail aborts the run and shows the variant at once', async () => {
    const {store, fake} = setup();
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'download'});
    store.getState().fail('network_lost');
    expect(run.signal.aborted).toBe(true);
    expect(store.getState().status).toBe('failed');
    expect(store.getState().error).toBe('connectionLost');
    expect(store.getState().phase).toBe('download');
    expect(jest.getTimerCount()).toBe(0);
    await settle();
    expect(store.getState().error).toBe('connectionLost');
  });

  it('fail and stop do nothing unless running', async () => {
    const {store, fake} = setup();
    store.getState().fail('network_lost');
    expect(store.getState().status).toBe('idle');
    store.getState().start();
    fake.last().resolve();
    await settle();
    store.getState().fail('network_lost');
    store.getState().stop();
    expect(store.getState().status).toBe('done');
  });

  it('start after a failure resets the run but keeps the cooldown', async () => {
    const {store, fake} = setup();
    store.getState().startCooldown(0, 1);
    store.getState().start();
    const run = fake.last();
    run.emit({type: 'phase', phase: 'download'});
    run.emit(download(10e6, 300));
    run.reject('timeout');
    await settle();
    store.getState().start();
    const s = store.getState();
    expect(s.status).toBe('running');
    expect(s.error).toBeUndefined();
    expect(s.bars).toEqual([]);
    expect(s.liveBps).toBeUndefined();
    expect(s.progress).toEqual({ping: 0, download: 0, upload: 0});
    expect(s.cooldownUntil).toBe(1);
  });
});
