import type {EngineEvent} from '~/modules/speedtest';
import {runUpload} from '~/modules/speedtest/engines/ndt7/upload';
import {FakeWebSocket} from '../../../../support/FakeWebSocket';
import {measurement} from '../../../../support/fixtures/ndt7';

const MiB = 1024 * 1024;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function start(
  signal = new AbortController().signal,
  prepare?: (socket: FakeWebSocket) => void,
) {
  const socket = new FakeWebSocket('wss://ndt-1.example/ul', 'p');
  prepare?.(socket);
  const events: EngineEvent[] = [];
  const promise = runUpload(socket, {
    now: () => Date.now(),
    signal,
    onEvent: (e) => events.push(e),
  });
  // Tests that don't finish the run still must not leak an unhandled rejection.
  const settled = promise.catch((error: unknown) => error);
  return {socket, events, promise, settled};
}

/** Server acknowledges everything sent so far. */
function ack(socket: FakeWebSocket, elapsedUs = 1_000_000) {
  socket.receive(
    measurement({BytesReceived: socket.totalSent, ElapsedTime: elapsedUs}),
  );
}

describe('runUpload', () => {
  it('sends at most 1 MiB per tick before yielding', () => {
    const {socket} = start();
    // 16×8 KiB, 8×16 KiB, 8×32 KiB, 8×64 KiB: exactly 1 MiB.
    expect(socket.sentSizes).toHaveLength(40);
    expect(socket.totalSent).toBe(MiB);
    jest.advanceTimersByTime(0);
    // At 128 KiB+ each tick still stops at the byte budget.
    expect(socket.totalSent).toBe(2 * MiB);
  });

  it('fills messages with varied bytes', () => {
    const {socket} = start();
    const [first] = [...socket.sentBuffers];
    expect(new Set(new Uint8Array(first)).size).toBeGreaterThan(200);
  });

  it('doubles message size up to 1 MiB and reuses one buffer per size', () => {
    const {socket} = start();
    for (let i = 0; i < 300; i++) {
      ack(socket);
      jest.advanceTimersByTime(1);
    }
    const sizes = [...new Set(socket.sentSizes)];
    expect(sizes).toEqual([
      8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576,
    ]);
    expect(socket.sentBuffers.size).toBe(sizes.length);
    expect(socket.sentSizes.filter((s) => s === 8192)).toHaveLength(16);
  });

  it('pauses while 8 MiB are in flight and resumes after the server catches up', () => {
    const {socket} = start();
    jest.advanceTimersByTime(100);
    const capped = socket.totalSent;
    expect(capped).toBeGreaterThanOrEqual(8 * MiB);
    expect(capped).toBeLessThan(9 * MiB);
    jest.advanceTimersByTime(100);
    expect(socket.totalSent).toBe(capped);
    ack(socket);
    jest.advanceTimersByTime(10);
    expect(socket.totalSent).toBeGreaterThan(capped);
  });

  it('also honors a numeric bufferedAmount', () => {
    const {socket} = start(undefined, (s) => {
      s.bufferedAmount = 8 * MiB;
    });
    jest.advanceTimersByTime(50);
    expect(socket.sentSizes).toEqual([]);
    socket.bufferedAmount = 0;
    jest.advanceTimersByTime(10);
    expect(socket.sentSizes.length).toBeGreaterThan(0);
  });

  it('emits server-side throughput and resolves with the last one after 10s', async () => {
    const {socket, events, promise} = start();
    jest.advanceTimersByTime(500);
    socket.receive(
      measurement({BytesReceived: 1_000_000, ElapsedTime: 500_000}),
    );
    expect(events).toEqual([
      {
        type: 'throughput',
        direction: 'upload',
        bps: 16_000_000,
        elapsedMs: 500,
      },
    ]);
    socket.receive(
      measurement({BytesReceived: 2_500_000, ElapsedTime: 1_000_000}),
    );
    jest.advanceTimersByTime(9_500);
    await expect(promise).resolves.toEqual({
      bps: 20_000_000,
      elapsedMs: 10_000,
    });
    expect(socket.closeCalls).toEqual([1000]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('ignores measurements with zero elapsed time or no TCPInfo', async () => {
    const {socket, events, settled} = start();
    socket.receive(measurement({BytesReceived: 1_000, ElapsedTime: 0}));
    socket.receive(JSON.stringify({AppInfo: {NumBytes: 1, ElapsedTime: 1}}));
    expect(events).toEqual([]);
    jest.advanceTimersByTime(10_000);
    expect(await settled).toMatchObject({code: 'protocol'});
  });

  it('completes on a normal server close before 10s', async () => {
    const {socket, promise} = start();
    socket.receive(
      measurement({BytesReceived: 1_000_000, ElapsedTime: 1_000_000}),
    );
    socket.serverClose(1000);
    await expect(promise).resolves.toMatchObject({bps: 8_000_000});
  });

  test.each([
    ['abnormal close', (s: FakeWebSocket) => s.serverClose(1006)],
    ['socket error', (s: FakeWebSocket) => s.fail()],
  ])('rejects network_lost on %s', async (_name, trigger) => {
    const {socket, promise} = start();
    trigger(socket);
    await expect(promise).rejects.toMatchObject({code: 'network_lost'});
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects network_lost when send throws', async () => {
    const {promise} = start(undefined, (s) => {
      s.throwOnSend = true;
    });
    await expect(promise).rejects.toMatchObject({code: 'network_lost'});
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects aborted on abort and stops sending', async () => {
    const controller = new AbortController();
    const {socket, promise} = start(controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({code: 'aborted'});
    const sent = socket.sentSizes.length;
    jest.advanceTimersByTime(1_000);
    expect(socket.sentSizes).toHaveLength(sent);
    expect(jest.getTimerCount()).toBe(0);
  });
});
