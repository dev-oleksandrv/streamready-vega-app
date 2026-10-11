import {
  formatClock,
  formatCountdown,
  formatMbps,
  formatMs,
  roundMbps,
} from '~/shared/lib/format';

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

describe('roundMbps', () => {
  test.each([
    [186_400_000, 186],
    [99_950_000, 100],
    [99_940_000, 99.9],
    [24_960_000, 25],
    [24_940_000, 24.9],
    [1_800_000, 1.8],
    [0, 0],
  ])('%p bps → %p', (bps, expected) => {
    expect(roundMbps(bps)).toBe(expected);
  });
});

describe('formatClock', () => {
  const at = (h: number, m: number) => new Date(2026, 9, 11, h, m).getTime();
  test.each([
    [0, 5, '12:05 AM'],
    [9, 7, '9:07 AM'],
    [12, 0, '12:00 PM'],
    [20, 41, '8:41 PM'],
    [23, 59, '11:59 PM'],
  ])('%p:%p → %p', (h, m, expected) => {
    expect(formatClock(at(h, m))).toBe(expected);
  });
});
