import {median} from '~/modules/speedtest/engines/ndt7/stats';

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
