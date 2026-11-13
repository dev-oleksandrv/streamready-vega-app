import {
  bitsPerSecond,
  DownloadLatency,
  UploadRate,
} from '~/modules/speedtest/engines/ndt7/measurements';

describe('bitsPerSecond', () => {
  it.each([
    [1_000_000, 1000, 8_000_000],
    [0, 1000, 0],
    [1000, 0, 0],
  ])('%d bytes over %d ms is %d bps', (bytes, ms, bps) => {
    expect(bitsPerSecond(bytes, ms)).toBe(bps);
  });
});

describe('DownloadLatency', () => {
  it('keeps the lowest MinRTT and the median RTT', () => {
    const latency = new DownloadLatency();
    latency.add({minRttMs: 12, rttMs: 20});
    latency.add({minRttMs: 10, rttMs: 40});
    latency.add({rttMs: 30});
    expect(latency.idleMs).toBe(10);
    expect(latency.loadedMs()).toBe(30);
  });

  it('emits a latency event only when a value changed', () => {
    const latency = new DownloadLatency();
    expect(latency.nextEvent()).toBeUndefined();
    latency.add({minRttMs: 10});
    expect(latency.nextEvent()).toEqual({
      type: 'latency',
      idleMs: 10,
      loadedMs: undefined,
    });
    expect(latency.nextEvent()).toBeUndefined();
    latency.add({rttMs: 25});
    expect(latency.nextEvent()).toEqual({
      type: 'latency',
      idleMs: 10,
      loadedMs: 25,
    });
  });
});

describe('DownloadLatency jitter', () => {
  const timed = (rttMs: number, elapsedMs: number) => ({rttMs, elapsedMs});

  it('orders samples by time, whatever the arrival order', () => {
    const inOrder = new DownloadLatency();
    [timed(10, 100), timed(20, 200), timed(10, 300), timed(16, 400)].forEach(
      (s) => inOrder.add(s),
    );
    const shuffled = new DownloadLatency();
    [timed(10, 300), timed(16, 400), timed(10, 100), timed(20, 200)].forEach(
      (s) => shuffled.add(s),
    );
    expect(inOrder.jitterMs()).toBe((10 + 10 + 6) / 3);
    expect(shuffled.jitterMs()).toBe(inOrder.jitterMs());
  });

  it('uses atMs over the sample time', () => {
    const latency = new DownloadLatency();
    latency.add({rttMs: 10, elapsedMs: 900}, 100);
    latency.add({rttMs: 20, elapsedMs: 800}, 200);
    latency.add({rttMs: 10, elapsedMs: 700}, 300);
    expect(latency.jitterMs()).toBe(10);
  });

  it('keeps arrival order for equal times', () => {
    const latency = new DownloadLatency();
    latency.add(timed(10, 100));
    latency.add(timed(30, 100));
    latency.add(timed(10, 100));
    expect(latency.jitterMs()).toBe(20);
  });

  it('leaves untimed samples out of jitter but not out of loadedMs', () => {
    const latency = new DownloadLatency();
    latency.add({rttMs: 100});
    latency.add(timed(10, 100));
    latency.add(timed(20, 200));
    expect(latency.jitterMs()).toBeUndefined();
    expect(latency.loadedMs()).toBe(20);
    latency.add(timed(10, 300));
    expect(latency.jitterMs()).toBe(10);
  });

  it('is undefined with fewer than 3 timed samples', () => {
    const latency = new DownloadLatency();
    expect(latency.jitterMs()).toBeUndefined();
    latency.add(timed(10, 100));
    latency.add(timed(20, 200));
    expect(latency.jitterMs()).toBeUndefined();
  });
});

describe('UploadRate', () => {
  it('derives bps from BytesReceived over ElapsedTime', () => {
    const rate = new UploadRate();
    expect(rate.add({bytesReceived: 500_000, elapsedMs: 1000})).toBe(4_000_000);
    expect(rate.lastBps).toBe(4_000_000);
    expect(rate.serverBytes).toBe(500_000);
  });

  it('ignores a sample older than the last one', () => {
    const rate = new UploadRate();
    rate.add({bytesReceived: 1_000_000, elapsedMs: 2000});
    expect(rate.add({bytesReceived: 400_000, elapsedMs: 1000})).toBeUndefined();
    expect(rate.lastBps).toBe(4_000_000);
    expect(rate.serverBytes).toBe(1_000_000);
  });

  it.each([
    [{bytesReceived: 1000}],
    [{elapsedMs: 1000}],
    [{bytesReceived: 1000, elapsedMs: 0}],
  ])('ignores incomplete sample %j', (sample) => {
    const rate = new UploadRate();
    expect(rate.add(sample)).toBeUndefined();
    expect(rate.lastBps).toBeUndefined();
  });
});
