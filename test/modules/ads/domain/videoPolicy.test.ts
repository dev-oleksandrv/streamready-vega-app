import {canShowVideo, VIDEO_INTERVAL_MS} from '~/modules/ads';

const NOW = 1_800_000_000_000;
const min = (m: number, s = 0) => (m * 60 + s) * 1000;

describe('canShowVideo', () => {
  it('waits 30 minutes between videos', () => {
    expect(VIDEO_INTERVAL_MS).toBe(min(30));
  });

  it('allows the first video ever', () => {
    expect(canShowVideo({now: NOW, lastVideoAt: undefined, tier: 'good'})).toBe(
      true,
    );
  });

  it.each([
    [min(29, 59), false],
    [min(30), true],
    [min(31), true],
    [0, false],
  ])('%i ms after the last video → %s', (elapsed, allowed) => {
    expect(
      canShowVideo({now: NOW, lastVideoAt: NOW - elapsed, tier: 'good'}),
    ).toBe(allowed);
  });

  it('treats a last video in the future (clock moved back) as just shown', () => {
    expect(
      canShowVideo({now: NOW, lastVideoAt: NOW + min(60), tier: 'good'}),
    ).toBe(false);
  });

  it.each(['limited', 'poor'] as const)(
    'never shows after a %s result',
    (tier) => {
      expect(canShowVideo({now: NOW, lastVideoAt: undefined, tier})).toBe(
        false,
      );
    },
  );
});
