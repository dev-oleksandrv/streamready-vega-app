import type {SpeedTestResult} from '~/modules/speedtest';
import {resultEyebrow} from '~/modules/speedtest/ui/resultText';

const finishedAt = new Date(2026, 9, 11, 20, 41).getTime();
const result = (city?: string): SpeedTestResult => ({
  downloadBps: 1,
  uploadBps: 1,
  idleLatencyMs: 1,
  loadedLatencyMs: 1,
  latencySource: 'server',
  server: {machine: 'mlab1-tst01.example', city},
  finishedAt,
});

describe('resultEyebrow', () => {
  it('same day, with a city', () => {
    const now = new Date(2026, 9, 11, 23, 0).getTime();
    expect(resultEyebrow(result('Frankfurt'), now)).toBe(
      'Result · Today, 8:41 PM · Frankfurt server',
    );
  });

  it('another day drops "Today"', () => {
    const now = new Date(2026, 9, 12, 0, 1).getTime();
    expect(resultEyebrow(result('Frankfurt'), now)).toBe(
      'Result · 8:41 PM · Frankfurt server',
    );
  });

  it('no city drops the server part', () => {
    expect(resultEyebrow(result(), finishedAt)).toBe('Result · Today, 8:41 PM');
  });
});
