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
});
