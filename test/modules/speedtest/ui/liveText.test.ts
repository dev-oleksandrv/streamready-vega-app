import {
  latencyText,
  liveLabel,
  liveUnit,
  liveValue,
  serverName,
} from '~/modules/speedtest';

describe('liveLabel', () => {
  it.each([
    [
      {status: 'running', phase: undefined, uploadProgress: 0},
      'Finding server',
    ],
    [
      {status: 'running', phase: 'locating', uploadProgress: 0},
      'Finding server',
    ],
    [
      {status: 'running', phase: 'latency', uploadProgress: 0},
      'Measuring ping',
    ],
    [{status: 'running', phase: 'download', uploadProgress: 0}, 'Download'],
    [{status: 'running', phase: 'upload', uploadProgress: 0.5}, 'Upload'],
    [{status: 'running', phase: 'upload', uploadProgress: 1}, 'Finishing'],
    [{status: 'failed', phase: 'upload', uploadProgress: 1}, 'Upload'],
    [{status: 'done', phase: 'upload', uploadProgress: 1}, 'Finished'],
  ] as const)('%j → %s', (input, label) => {
    expect(liveLabel(input)).toBe(label);
  });
});

describe('liveUnit / liveValue', () => {
  it('shows ms only while measuring ping', () => {
    expect(liveUnit('latency')).toBe('ms');
    expect(liveUnit('download')).toBe('Mbps');
    expect(liveUnit(undefined)).toBe('Mbps');
  });

  it('shows Mbps during download and upload, a dash otherwise', () => {
    expect(liveValue('download', 186_400_000)).toBe('186');
    expect(liveValue('upload', 23_800_000)).toBe('23.8');
    expect(liveValue('upload', undefined)).toBe('—');
    expect(liveValue('latency', 5e6)).toBe('—');
    expect(liveValue(undefined, undefined)).toBe('—');
  });
});

describe('latencyText', () => {
  it('formats ms or shows a dash', () => {
    expect(latencyText(52.4)).toBe('52 ms');
    expect(latencyText(undefined)).toBe('—');
  });
});

describe('serverName', () => {
  it('uses city and country, then the provider', () => {
    expect(
      serverName({
        machine: 'mlab1-tst01.example',
        city: 'Frankfurt',
        country: 'DE',
      }),
    ).toBe('Frankfurt, DE · M‑Lab');
  });

  it('falls back to the machine name', () => {
    expect(serverName({machine: 'mlab1-tst01.example'})).toBe(
      'mlab1-tst01.example',
    );
  });
});
