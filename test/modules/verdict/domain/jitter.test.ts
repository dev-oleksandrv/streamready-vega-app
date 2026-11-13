import {JITTER_LEVELS, jitterLevel} from '~/modules/verdict';

describe('jitterLevel', () => {
  test.each([
    [0, 'steady', 'good'],
    [9.4, 'steady', 'good'],
    [9.5, 'uneven', 'warn'],
    [10, 'uneven', 'warn'],
    [29.4, 'uneven', 'warn'],
    [29.5, 'unstable', 'bad'],
    [30, 'unstable', 'bad'],
    [500, 'unstable', 'bad'],
  ] as const)('%s ms is %s / %s', (ms, level, tone) => {
    expect(jitterLevel(ms)).toEqual({level, tone});
  });

  it('keeps levels ascending', () => {
    expect(JITTER_LEVELS.map((l) => l.underMs)).toEqual([10, 30]);
  });
});
