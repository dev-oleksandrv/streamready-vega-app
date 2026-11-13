import {SERVICES} from '~/modules/verdict';
import {STREAM_CHECKS} from '~/modules/verdict';

type Cell = [string, 'hd' | 'fhd' | 'uhd', number, string];

const O = 'official';
const T = 'typical';

const TABLE: Record<
  string,
  [[number, string], [number, string], [number, string]]
> = {
  netflix: [
    [3, O],
    [5, O],
    [15, O],
  ],
  primeVideo: [
    [3, T],
    [5, T],
    [25, T],
  ],
  youtube: [
    [2.5, O],
    [5, O],
    [20, O],
  ],
  disneyPlus: [
    [3, T],
    [5, T],
    [25, T],
  ],
  appleTv: [
    [3, T],
    [5, T],
    [25, O],
  ],
  hboMax: [
    [3, T],
    [5, O],
    [25, O],
  ],
};

const CELLS: Cell[] = Object.entries(TABLE).flatMap(([id, tiers]) =>
  (['hd', 'fhd', 'uhd'] as const).map(
    (tier, i): Cell => [id, tier, tiers[i][0], tiers[i][1]],
  ),
);

describe('SERVICES', () => {
  it('lists the six ids in the fixed order', () => {
    expect(SERVICES.map((s) => s.id)).toEqual([
      'netflix',
      'primeVideo',
      'youtube',
      'disneyPlus',
      'appleTv',
      'hboMax',
    ]);
  });

  it('has hd, fhd, uhd per service with non-decreasing minimums', () => {
    for (const s of SERVICES) {
      expect(s.tiers.map((t) => t.tier)).toEqual(['hd', 'fhd', 'uhd']);
      const mins = s.tiers.map((t) => t.minMbps);
      expect(mins).toEqual([...mins].sort((a, b) => a - b));
    }
  });

  test.each(CELLS)('%s %s needs %s (%s)', (id, tier, minMbps, source) => {
    const found = SERVICES.find((s) => s.id === id)?.tiers.find(
      (t) => t.tier === tier,
    );
    expect(found).toEqual({tier, minMbps, source});
  });

  it('typical tiers equal the generic STREAM_CHECKS value', () => {
    for (const s of SERVICES) {
      for (const t of s.tiers.filter((x) => x.source === 'typical')) {
        expect(t.minMbps).toBe(
          STREAM_CHECKS.find((c) => c.id === t.tier)?.minMbps,
        );
      }
    }
  });
});
