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
