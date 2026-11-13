import {meanAbsDelta, median} from '~/modules/speedtest/engines/ndt7/stats';

describe('median', () => {
  test.each([
    [[5], 5],
    [[3, 1, 2], 2],
    [[4, 1, 3, 2], 2.5],
    [[10, 10, 30], 10],
  ])('%j → %d', (values, expected) => {
    expect(median(values)).toBe(expected);
  });

  it('does not reorder the input', () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });

  it('is NaN for an empty list', () => {
    expect(median([])).toBeNaN();
  });
});

describe('meanAbsDelta', () => {
  test.each([
    [[], undefined],
    [[5], undefined],
    [[5, 9], undefined],
    [[10, 20, 10], 10],
    [[10, 12, 9, 15], (2 + 3 + 6) / 3],
  ])('%j → %s', (values, expected) => {
    expect(meanAbsDelta(values)).toBe(expected);
  });
});
