import {verdictContent} from '~/modules/verdict';

describe('verdictContent', () => {
  test.each([
    ['twoUhd', 'Ready for 4K.'],
    ['oneUhd', 'Ready for 4K.'],
    ['laggy', 'Fast, but laggy.'],
    ['limited', 'Full HD, yes. 4K may buffer.'],
    ['hdOnly', 'HD only. Full HD may buffer.'],
    ['buffering', 'Streaming will buffer.'],
  ] as const)('%s headline', (outcome, headline) => {
    expect(verdictContent.outcomes[outcome].headline).toBe(headline);
  });

  it('poor subs share the weak Wi‑Fi line', () => {
    expect(verdictContent.outcomes.hdOnly.sub).toBe(
      'Only HD is likely to play smoothly. Your Wi‑Fi is overloaded or too weak where the TV is.',
    );
    expect(verdictContent.outcomes.buffering.sub).toBe(
      'Even HD needs more. Your Wi‑Fi is overloaded or too weak where the TV is.',
    );
  });

  test.each([
    [
      'twoUhd',
      true,
      'Two 4K streams at once, no buffering expected. Your connection is in great shape.',
    ],
    [
      'twoUhd',
      false,
      'Two 4K streams at once, no buffering expected. Your connection is in great shape.',
    ],
    [
      'limited',
      true,
      'Speed is enough for 1080p. For 4K, move the stick closer to the router or switch to 5 GHz.',
    ],
    [
      'limited',
      false,
      'Speed is enough for 1080p. For 4K, pause other downloads on your network or check your internet plan.',
    ],
    [
      'hdOnly',
      false,
      'Only HD is likely to play smoothly. Your internet plan is too slow or your network is busy.',
    ],
    [
      'buffering',
      false,
      'Even HD needs more. Your internet plan is too slow or your network is busy.',
    ],
  ] as const)('%s sub, on Wi‑Fi: %s', (outcome, onWifi, text) => {
    expect(verdictContent.outcomeSub(outcome, onWifi)).toBe(text);
  });

  test.each([
    ['A', 'Grade A. Smooth, even when busy.'],
    ['B', 'Grade B. Smooth, even when busy.'],
    ['C', 'Grade C. Lag spikes when busy.'],
    ['D', 'Grade D. This is why it stalls.'],
    ['F', 'Grade F. This is why it stalls.'],
  ] as const)('latency headline %s', (grade, text) => {
    expect(verdictContent.latencyHeadline(grade)).toBe(text);
  });

  it('formats the need line', () => {
    expect(verdictContent.needs(25)).toBe('Needs 25 Mbps');
  });

  describe('services', () => {
    it('names the six services', () => {
      expect(verdictContent.services.names).toEqual({
        netflix: 'Netflix',
        primeVideo: 'Prime Video',
        youtube: 'YouTube',
        disneyPlus: 'Disney+',
        appleTv: 'Apple TV',
        hboMax: 'HBO Max',
      });
    });

    it('reuses the check labels for tiers', () => {
      expect(verdictContent.services.tiers).toEqual({
        hd: 'HD 720p',
        fhd: 'Full HD 1080p',
        uhd: '4K Ultra HD',
      });
    });

    test.each([
      [{tier: 'uhd', minMbps: 15, source: 'official'}, 'Needs 15 Mbps'],
      [
        {tier: 'uhd', minMbps: 25, source: 'typical'},
        'Typically needs 25 Mbps',
      ],
      [{tier: 'hd', minMbps: 2.5, source: 'official'}, 'Needs 2.5 Mbps'],
    ] as const)('need %j', (tier, text) => {
      expect(verdictContent.services.need(tier)).toBe(text);
    });

    it('formats the next line and the none text', () => {
      expect(
        verdictContent.services.next({
          tier: 'uhd',
          minMbps: 15,
          source: 'official',
        }),
      ).toBe('4K Ultra HD · Needs 15 Mbps');
      expect(verdictContent.services.none).toBe('Not enough for HD');
    });
  });

  describe('jitter', () => {
    it('has the label, three level labels and an explanation', () => {
      expect(verdictContent.jitter.label).toBe('Jitter');
      expect(verdictContent.jitter.levels).toEqual({
        steady: 'Steady',
        uneven: 'Uneven',
        unstable: 'Unstable',
      });
      expect(verdictContent.jitter.explain).toMatch(/^Jitter is how much/);
    });
  });
});
