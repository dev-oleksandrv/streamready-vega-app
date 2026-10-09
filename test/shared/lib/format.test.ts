import {formatCountdown, formatMbps, formatMs} from '~/shared/lib/format';

describe('formatMbps', () => {
  test.each([
    [186_400_000, '186'],
    [100_000_000, '100'],
    [99_950_000, '100'],
    [99_940_000, '99.9'],
    [38_200_000, '38.2'],
    [1_800_000, '1.8'],
    [0, '0.0'],
    [-1, '—'],
    [Number.NaN, '—'],
    [Number.POSITIVE_INFINITY, '—'],
  ])('%p bps → %p', (bps, expected) => {
    expect(formatMbps(bps)).toBe(expected);
  });
});

describe('formatMs', () => {
  test.each([
    [14, '14'],
    [52.4, '52'],
    [52.5, '53'],
    [0, '0'],
    [-3, '—'],
    [Number.NaN, '—'],
  ])('%p ms → %p', (ms, expected) => {
    expect(formatMs(ms)).toBe(expected);
  });
});

describe('formatCountdown', () => {
  test.each([
    [30, '0:30'],
    [5, '0:05'],
    [4.2, '0:05'],
    [0, '0:00'],
    [-2, '0:00'],
    [75, '1:15'],
    [Number.NaN, '0:00'],
  ])('%p s → %p', (s, expected) => {
    expect(formatCountdown(s)).toBe(expected);
  });
});
