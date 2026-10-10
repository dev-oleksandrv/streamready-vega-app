import {emptyStall, recordStall, summarizeStall} from '~/app/debug/stallMeter';

describe('recordStall', () => {
  it('tracks max and average lateness', () => {
    let s = recordStall(emptyStall, 0);
    s = recordStall(s, 300);
    s = recordStall(s, 60);
    expect(s).toEqual({maxMs: 300, totalMs: 360, samples: 3});
  });

  it('clamps negative lateness to zero', () => {
    expect(recordStall(emptyStall, -5)).toEqual({
      maxMs: 0,
      totalMs: 0,
      samples: 1,
    });
  });
});

describe('summarizeStall', () => {
  test.each([
    [emptyStall, undefined],
    [
      {maxMs: 300, totalMs: 360, samples: 3},
      {maxMs: 300, avgMs: 120},
    ],
    [
      {maxMs: 12.6, totalMs: 12.6, samples: 1},
      {maxMs: 13, avgMs: 13},
    ],
  ])('%j → %j', (stats, expected) => {
    expect(summarizeStall(stats)).toEqual(expected);
  });
});
