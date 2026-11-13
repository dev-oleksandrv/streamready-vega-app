import {shownMbps} from '~/modules/verdict/domain/shownMbps';

describe('shownMbps', () => {
  test.each([
    [25_000_000, 25],
    [24_960_000, 25],
    [14_960_000, 15],
    [14_900_000, 14.9],
    [0, 0],
    [-1, 0],
    [NaN, 0],
    [Infinity, 0],
  ])('%s bps shows %s', (bps, mbps) => {
    expect(shownMbps(bps)).toBe(mbps);
  });
});
