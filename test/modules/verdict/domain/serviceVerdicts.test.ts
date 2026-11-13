import {SERVICES, serviceVerdicts} from '~/modules/verdict';

const bps = (mbps: number) => Math.round(mbps * 1_000_000);

function row(id: string, downloadBps: number) {
  const r = serviceVerdicts(downloadBps).find((v) => v.id === id);
  if (!r) {
    throw new Error(`no row ${id}`);
  }
  return r;
}

describe('serviceVerdicts', () => {
  it('returns one row per service in table order', () => {
    expect(serviceVerdicts(bps(10)).map((v) => v.id)).toEqual(
      SERVICES.map((s) => s.id),
    );
  });

  describe.each(SERVICES.map((s) => [s.id, s.tiers] as const))(
    '%s',
    (id, tiers) => {
      tiers.forEach((t, i) => {
        it(`exactly ${t.minMbps} Mbps passes ${t.tier}`, () => {
          expect(row(id, bps(t.minMbps)).best?.tier).toBe(t.tier);
        });

        it(`0.1 Mbps under ${t.minMbps} fails ${t.tier}`, () => {
          const r = row(id, bps(t.minMbps - 0.1));
          const prev = tiers[i - 1];
          expect(r.best?.tier).toBe(prev?.tier);
          expect(r.next?.tier).toBe(t.tier);
        });
      });

      it('below the lowest tier has no best and next is the lowest', () => {
        const r = row(id, bps(0.5));
        expect(r.best).toBeUndefined();
        expect(r.next).toBe(tiers[0]);
      });

      it('4K has no next', () => {
        const r = row(id, bps(1000));
        expect(r.best?.tier).toBe('uhd');
        expect(r.next).toBeUndefined();
      });
    },
  );

  it('matches the documented examples', () => {
    expect(row('netflix', bps(15)).best?.tier).toBe('uhd');
    expect(row('netflix', bps(14.9)).best?.tier).toBe('fhd');
    expect(row('youtube', bps(2.5)).best?.tier).toBe('hd');
    expect(row('youtube', bps(2.4)).best).toBeUndefined();
  });

  it('uses the shown rounding', () => {
    expect(row('netflix', 14_960_000).best?.tier).toBe('uhd');
  });

  test.each([NaN, -1, Infinity])('%s gives no quality', (input) => {
    for (const r of serviceVerdicts(input)) {
      expect(r.best).toBeUndefined();
      expect(r.next?.tier).toBe('hd');
    }
  });
});
