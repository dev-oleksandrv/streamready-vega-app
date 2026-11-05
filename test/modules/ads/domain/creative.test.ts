import {parseVast, toCreative, type VastDocument} from '~/modules/ads';

import {
  EMPTY,
  EMPTY_WITH_ERROR,
  INLINE_COMPANION,
  INLINE_LINEAR,
  INLINE_LONG_VIDEO,
  INLINE_MISSING_TITLE,
  INLINE_NONLINEAR,
  INLINE_STREAMING_ONLY,
  INLINE_VAST2,
  wrapperXml,
} from '../../../support/fixtures/vast';

const chain = (...xml: string[]): VastDocument[] => xml.map(parseVast);

function creative(...args: Parameters<typeof toCreative>) {
  const outcome = toCreative(...args);
  if (!outcome.ok) {
    throw new Error(`expected a creative, got error ${outcome.code}`);
  }
  return outcome.creative;
}

describe('toCreative: video', () => {
  it('builds a video creative from an inline linear ad', () => {
    expect(creative(chain(INLINE_LINEAR), 'video')).toMatchObject({
      id: 'lumen-video-1',
      advertiser: 'Lumen Stream',
      title: 'Lumen Stream: every match in 4K',
      clickThrough: 'https://lumen.example/offer',
      displayUrl: 'lumen.example/4k',
      video: {durationMs: 20_500},
      impressions: ['https://ads.example/imp/lumen?cb=[CACHEBUSTING]'],
    });
  });

  it('merges wrapper impressions, errors and trackers in chain order', () => {
    const c = creative(chain(wrapperXml(), INLINE_LINEAR), 'video');
    expect(c.impressions).toEqual([
      'https://ads.example/imp/wrapper-1',
      'https://ads.example/imp/lumen?cb=[CACHEBUSTING]',
    ]);
    expect(c.errors).toEqual([
      'https://ads.example/err/wrapper-1?code=[ERRORCODE]',
      'https://ads.example/err/lumen?code=[ERRORCODE]',
    ]);
    expect(c.tracking.start).toEqual([
      'https://ads.example/t/wrapper-1-start',
      'https://ads.example/t/start',
    ]);
    expect(c.tracking.complete).toEqual(['https://ads.example/t/complete']);
    // Card trackers of the wrapper don't apply to a video.
    expect(c.tracking.creativeView).toBeUndefined();
    expect(c.id).toBe('lumen-video-1');
  });

  it('accepts a VAST 2.0 ad with one usable mp4', () => {
    expect(creative(chain(INLINE_VAST2), 'video').video?.durationMs).toBe(
      15_000,
    );
  });

  it.each([
    ['a non-linear ad', INLINE_NONLINEAR, 201],
    ['no progressive mp4', INLINE_STREAMING_ONLY, 403],
    ['a video longer than 30 s', INLINE_LONG_VIDEO, 202],
  ])('refuses %s with error %i', (_name, xml, code) => {
    expect(toCreative(chain(xml), 'video')).toMatchObject({ok: false, code});
  });
});

describe('toCreative: cards', () => {
  it.each(['result', 'home'] as const)(
    'builds a %s card from a non-linear image',
    (slot) => {
      expect(creative(chain(INLINE_NONLINEAR), slot)).toEqual({
        id: 'kestrel-card-1',
        advertiser: 'Kestrel Routers',
        title: 'Fix lag spikes with smart queue management',
        description:
          'Kestrel routers keep video smooth when everyone is online.',
        clickThrough: 'https://kestrel.example/qos?src=tv&c=1',
        displayUrl: 'kestrel.example/qos',
        image: {
          uri: 'https://cdn.ads.example/kestrel.jpg',
          width: 1280,
          height: 720,
        },
        impressions: ['https://ads.example/imp/kestrel'],
        errors: ['https://ads.example/err/kestrel?code=[ERRORCODE]'],
        tracking: {creativeView: ['https://ads.example/t/kestrel-view']},
      });
    },
  );

  it('picks the largest companion image up to 1920 px wide, with its click and view', () => {
    expect(creative(chain(INLINE_COMPANION), 'home')).toMatchObject({
      image: {uri: 'https://cdn.ads.example/northwind-1920.png'},
      clickThrough: 'https://northwind.example/mesh',
      tracking: {creativeView: ['https://ads.example/t/northwind-view']},
    });
  });

  it('merges the wrapper view tracker into a card', () => {
    const c = creative(chain(wrapperXml(), INLINE_NONLINEAR), 'result');
    expect(c.tracking).toEqual({
      creativeView: [
        'https://ads.example/t/wrapper-1-view',
        'https://ads.example/t/kestrel-view',
      ],
    });
  });

  it('drops a click-through that is not http(s)', () => {
    const xml = INLINE_NONLINEAR.replace(
      'https://kestrel.example/qos?src=tv&amp;c=1',
      'intent://kestrel.example/qos',
    );
    expect(creative(chain(xml), 'result').clickThrough).toBeUndefined();
  });

  it('skips images without a size', () => {
    const xml = INLINE_NONLINEAR.replace(' width="1280" height="720"', '');
    expect(toCreative(chain(xml), 'result')).toMatchObject({
      ok: false,
      code: 503,
    });
  });

  it.each([
    ['a linear ad', INLINE_LINEAR, 201],
    ['an ad without AdTitle', INLINE_MISSING_TITLE, 101],
  ])('refuses %s with error %i', (_name, xml, code) => {
    expect(toCreative(chain(xml), 'result')).toMatchObject({
      ok: false,
      code,
    });
  });

  it('hashes an id when the ad has none', () => {
    const xml = INLINE_NONLINEAR.replace(' id="kestrel-card-1"', '');
    const a = creative(chain(xml), 'home');
    expect(a.id).toBe('cr-kestrel');
    const bare = xml.replace(' id="cr-kestrel"', '');
    const b = creative(chain(bare), 'home');
    expect(b.id).toMatch(/^h[0-9a-z]+$/);
    expect(creative(chain(bare), 'home').id).toBe(b.id);
  });
});

describe('toCreative: no fill', () => {
  it('reports 303 with the root error tracker for an empty response', () => {
    expect(toCreative(chain(EMPTY_WITH_ERROR), 'home')).toEqual({
      ok: false,
      code: 303,
      errors: ['https://ads.example/err/nofill?code=[ERRORCODE]'],
    });
  });

  it('reports 303 with the wrapper error trackers when the wrapper ends empty', () => {
    expect(toCreative(chain(wrapperXml(), EMPTY), 'video')).toEqual({
      ok: false,
      code: 303,
      errors: ['https://ads.example/err/wrapper-1?code=[ERRORCODE]'],
    });
  });

  it('includes the inline error trackers when a creative is refused', () => {
    expect(
      toCreative(chain(wrapperXml(), INLINE_STREAMING_ONLY), 'video'),
    ).toEqual({
      ok: false,
      code: 403,
      errors: [
        'https://ads.example/err/wrapper-1?code=[ERRORCODE]',
        'https://ads.example/err/hls?code=[ERRORCODE]',
      ],
    });
  });
});
