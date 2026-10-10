import type {EngineEvent} from '~/modules/speedtest';
import {runDownload} from '~/modules/speedtest/engines/ndt7/download';
import {FakeBlob, FakeWebSocket} from '../../../../support/FakeWebSocket';
import {measurement} from '../../../../support/fixtures/ndt7';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function start(signal = new AbortController().signal) {
  const socket = new FakeWebSocket('wss://ndt-1.example/dl', 'p');
  const events: EngineEvent[] = [];
  const promise = runDownload(socket, {
    now: () => Date.now(),
    signal,
    onEvent: (e) => events.push(e),
  });
  return {socket, events, promise};
}

describe('runDownload', () => {
  it('counts bytes and resolves on normal server close', async () => {
    const {socket, promise} = start();
    socket.receive(new ArrayBuffer(10_000));
    socket.receive(new Uint8Array(5_000));
    socket.receive(measurement({MinRTT: 20_000, RTT: 40_000}));
    socket.receive(measurement({MinRTT: 18_000, RTT: 50_000}));
    socket.receive(measurement({RTT: 60_000}));
    jest.advanceTimersByTime(1_000);
    socket.serverClose(1000);
    await expect(promise).resolves.toEqual({
      bytes: 15_000,
      messages: 5,
      elapsedMs: 1_000,
      bps: 120_000,
      idleLatencyMs: 18,
      loadedLatencyMs: 50,
    });
    expect(socket.onmessage).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('emits throughput and changed latency every 250ms', async () => {
    const {socket, events, promise} = start();
    socket.receive(new ArrayBuffer(1_000));
    socket.receive(measurement({MinRTT: 20_000, RTT: 30_000}));
    jest.advanceTimersByTime(250);
    expect(events).toEqual([
      {type: 'throughput', direction: 'download', bps: 32_000, elapsedMs: 250},
      {type: 'latency', idleMs: 20, loadedMs: 30},
    ]);
    jest.advanceTimersByTime(250);
    // Latency unchanged → only throughput.
    expect(events).toHaveLength(3);
    expect(events[2]).toEqual({
      type: 'throughput',
      direction: 'download',
      bps: 16_000,
      elapsedMs: 500,
    });
    socket.serverClose(1000);
    await promise;
  });

  it('counts blob sizes and closes each blob', async () => {
    const {socket, promise} = start();
    const blob = new FakeBlob(4_096);
    socket.receive(blob);
    socket.receive(measurement({MinRTT: 10_000, RTT: 10_000}));
    jest.advanceTimersByTime(1_000);
    socket.serverClose(1000);
    await expect(promise).resolves.toMatchObject({bytes: 4_096});
    expect(blob.close).toHaveBeenCalledTimes(1);
  });

  it('switches a blob socket back to arraybuffer when done', async () => {
    const {socket, promise} = start();
    socket.binaryType = 'blob';
    socket.receive(measurement({MinRTT: 10_000, RTT: 10_000}));
    socket.serverClose(1000);
    await promise;
    // Releases the platform's per-socket blob handler, which close() skips once CLOSED.
    expect(socket.binaryType).toBe('arraybuffer');
  });

  it('completes on the close-frame echo, timing the download up to it', async () => {
    const {socket, promise} = start();
    socket.receive(new ArrayBuffer(10_000));
    socket.receive(measurement({MinRTT: 20_000, RTT: 30_000}));
    jest.advanceTimersByTime(1_000);
    // Vega: the server's close frame arrives as text; onclose follows seconds later with code 1.
    socket.receive('\u0003');
    await expect(promise).resolves.toMatchObject({
      bytes: 10_000,
      elapsedMs: 1_000,
      idleLatencyMs: 20,
    });
    expect(socket.closeCalls).toEqual([1000]);
  });

  it('rejects protocol when no MinRTT arrived', async () => {
    const {socket, promise} = start();
    socket.receive(new ArrayBuffer(1_000));
    socket.serverClose(1000);
    await expect(promise).rejects.toMatchObject({code: 'protocol'});
  });

  it('rejects protocol on malformed measurement and closes the socket', async () => {
    const {socket, promise} = start();
    socket.receive('{not json');
    await expect(promise).rejects.toMatchObject({code: 'protocol'});
    expect(socket.closeCalls).toHaveLength(1);
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

  it('rejects timeout after 15s', async () => {
    const {socket, promise} = start();
    const failure = promise.catch((error: unknown) => error);
    jest.advanceTimersByTime(15_000);
    expect(await failure).toMatchObject({code: 'timeout'});
    expect(socket.closeCalls).toHaveLength(1);
  });

  it('rejects aborted on abort and cleans up', async () => {
    const controller = new AbortController();
    const {socket, promise} = start(controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({code: 'aborted'});
    expect(socket.closeCalls).toHaveLength(1);
    expect(socket.onclose).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects aborted immediately when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const {socket, promise} = start(controller.signal);
    await expect(promise).rejects.toMatchObject({code: 'aborted'});
    expect(socket.closeCalls).toHaveLength(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
