import {
  FULL_PROGRESS,
  NO_PROGRESS,
  progressForPhase,
  subtestFraction,
} from '~/modules/speedtest';

describe('progressForPhase', () => {
  it('locating keeps ping at 0', () => {
    expect(progressForPhase(NO_PROGRESS, 'locating')).toEqual(NO_PROGRESS);
  });

  it('latency fills half the ping step', () => {
    expect(progressForPhase(NO_PROGRESS, 'latency')).toEqual({
      ping: 0.5,
      download: 0,
      upload: 0,
    });
  });

  it('download completes ping and keeps download progress', () => {
    expect(
      progressForPhase({ping: 0.5, download: 0.2, upload: 0}, 'download'),
    ).toEqual({ping: 1, download: 0.2, upload: 0});
  });

  it('upload completes ping and download', () => {
    expect(
      progressForPhase({ping: 1, download: 0.93, upload: 0}, 'upload'),
    ).toEqual({ping: 1, download: 1, upload: 0});
  });

  it('FULL_PROGRESS is all ones', () => {
    expect(FULL_PROGRESS).toEqual({ping: 1, download: 1, upload: 1});
  });
});

describe('subtestFraction', () => {
  it.each([
    [0, 0],
    [2_500, 0.25],
    [10_000, 1],
    [14_000, 1],
    [-5, 0],
    [Number.NaN, 0],
  ])('%d ms → %d', (elapsedMs, fraction) => {
    expect(subtestFraction(elapsedMs)).toBe(fraction);
  });
});
