import {vpnStatusFromState} from '~/modules/insights';

describe('vpnStatusFromState', () => {
  it.each([
    [3, 'on'],
    [0, 'off'],
    [1, 'off'],
    [2, 'off'],
    [4, 'off'],
    [-1, 'unknown'],
    [5, 'unknown'],
    [99, 'unknown'],
    [Number.NaN, 'unknown'],
    [2.5, 'unknown'],
  ] as const)('%p → %s', (raw, expected) => {
    expect(vpnStatusFromState(raw)).toBe(expected);
  });
});
