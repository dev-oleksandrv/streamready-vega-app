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
