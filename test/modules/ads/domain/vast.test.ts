import {parseDuration, parseVast, VastError} from '~/modules/ads';

import {
  EMPTY,
  EMPTY_WITH_ERROR,
  INLINE_COMPANION,
  INLINE_LINEAR,
  INLINE_MISSING_TITLE,
  INLINE_NONLINEAR,
  INLINE_VAST2,
  MALFORMED,
  NOT_VAST,
  WRAPPER_WITHOUT_URI,
  wrapperXml,
} from '../../../support/fixtures/vast';

function inline(xml: string) {
  const doc = parseVast(xml);
  if (doc.kind !== 'inline') {
    throw new Error(`expected inline, got ${doc.kind}`);
  }
  return doc.ad;
}

describe('parseVast', () => {
  it('reads an inline linear ad (VAST 4.1, CDATA)', () => {
    const doc = parseVast(INLINE_LINEAR);
    expect(doc).toMatchObject({kind: 'inline', version: '4.1'});
    const ad = inline(INLINE_LINEAR);
    expect(ad).toMatchObject({
      id: 'lumen-video-1',
      title: 'Lumen Stream: every match in 4K',
      advertiser: 'Lumen Stream',
      description: 'Live sport in 4K HDR. First month free.',
      impressions: ['https://ads.example/imp/lumen?cb=[CACHEBUSTING]'],
      errors: ['https://ads.example/err/lumen?code=[ERRORCODE]'],
      displayUrl: 'https://www.lumen.example/4k/',
    });
    expect(ad.linear).toEqual({
      durationMs: 20_500,
      clickThrough: 'https://lumen.example/offer',
      mediaFiles: [
        {
          uri: 'https://cdn.ads.example/lumen-1080.mp4',
          type: 'video/mp4',
          delivery: 'progressive',
          width: 1920,
          height: 1080,
          bitrateKbps: 4500,
        },
        {
          uri: 'https://cdn.ads.example/lumen-720.mp4',
          type: 'video/mp4',
          delivery: 'progressive',
          width: 1280,
          height: 720,
          bitrateKbps: 2500,
        },
      ],
      tracking: {
        start: ['https://ads.example/t/start'],
        firstQuartile: ['https://ads.example/t/q1'],
        midpoint: ['https://ads.example/t/mid'],
        thirdQuartile: ['https://ads.example/t/q3'],
        complete: ['https://ads.example/t/complete'],
        skip: ['https://ads.example/t/skip'],
        pause: ['https://ads.example/t/pause'],
        resume: ['https://ads.example/t/resume'],
      },
    });
    expect(ad.images).toEqual([]);
  });

  it('reads a non-linear static image (VAST 3.0) and decodes entities', () => {
    const ad = inline(INLINE_NONLINEAR);
    expect(ad).toMatchObject({
      id: 'kestrel-card-1',
      title: 'Fix lag spikes with smart queue management',
      advertiser: 'Kestrel Routers',
      displayUrl: 'kestrel.example/qos',
      nonLinearTracking: {
        creativeView: ['https://ads.example/t/kestrel-view'],
      },
    });
    expect(ad.linear).toBeUndefined();
    expect(ad.images).toEqual([
      {
        uri: 'https://cdn.ads.example/kestrel.jpg',
        creativeType: 'image/jpeg',
        width: 1280,
        height: 720,
        clickThrough: 'https://kestrel.example/qos?src=tv&c=1',
        tracking: {},
      },
    ]);
  });

  it('reads static companions and skips HTML ones (VAST 4.2)', () => {
    const ad = inline(INLINE_COMPANION);
    expect(ad.images.map((i) => i.uri)).toEqual([
      'https://cdn.ads.example/northwind-640.png',
      'https://cdn.ads.example/northwind-1920.png',
      'https://cdn.ads.example/northwind-4k.png',
    ]);
    expect(ad.images[1]).toMatchObject({
      clickThrough: 'https://northwind.example/mesh',
      tracking: {creativeView: ['https://ads.example/t/northwind-view']},
    });
    expect(ad.description).toBeUndefined();
  });

  it('reads VAST 2.0 without CDATA and keeps every media file', () => {
    const ad = inline(INLINE_VAST2);
    expect(parseVast(INLINE_VAST2)).toMatchObject({version: '2.0'});
    expect(ad.linear?.durationMs).toBe(15_000);
    expect(ad.linear?.mediaFiles.map((f) => [f.type, f.delivery])).toEqual([
      ['application/x-mpegURL', 'streaming'],
      ['video/webm', 'progressive'],
      ['video/mp4', 'progressive'],
    ]);
    expect(ad.linear?.mediaFiles[0]?.bitrateKbps).toBeUndefined();
  });

  it('reads a wrapper with its trackers', () => {
    expect(parseVast(wrapperXml())).toEqual({
      kind: 'wrapper',
      version: '3.0',
      adTagUri: 'https://ads.example/inline?cb=[CACHEBUSTING]',
      ad: expect.objectContaining({
        id: 'wrapper-1',
        impressions: ['https://ads.example/imp/wrapper-1'],
        errors: ['https://ads.example/err/wrapper-1?code=[ERRORCODE]'],
        linear: expect.objectContaining({
          mediaFiles: [],
          tracking: {start: ['https://ads.example/t/wrapper-1-start']},
        }),
        nonLinearTracking: {
          creativeView: ['https://ads.example/t/wrapper-1-view'],
        },
      }),
    });
  });

  it('leaves AdTitle undefined when it is missing', () => {
    expect(inline(INLINE_MISSING_TITLE).title).toBeUndefined();
  });

  it.each([
    ['empty', EMPTY, []],
    [
      'empty with a no-ad error',
      EMPTY_WITH_ERROR,
      ['https://ads.example/err/nofill?code=[ERRORCODE]'],
    ],
  ])('reads an %s response as no fill', (_name, xml, errors) => {
    expect(parseVast(xml)).toEqual({
      kind: 'empty',
      version: expect.any(String),
      errors,
    });
  });

  it.each([
    ['malformed XML', MALFORMED, 100],
    ['an empty body', '', 100],
    ['a document that is not VAST', NOT_VAST, 101],
    ['a wrapper without VASTAdTagURI', WRAPPER_WITHOUT_URI, 101],
  ])('rejects %s with VAST error %i', (_name, xml, code) => {
    expect(() => parseVast(xml)).toThrow(VastError);
    try {
      parseVast(xml);
    } catch (e) {
      expect((e as VastError).code).toBe(code);
    }
  });
});

describe('parseDuration', () => {
  it.each([
    ['00:00:15', 15_000],
    ['00:00:20.5', 20_500],
    ['00:00:20.500', 20_500],
    ['01:02:03.004', 3_723_004],
    ['00:00:60', undefined],
    ['15', undefined],
    ['', undefined],
    [undefined, undefined],
  ])('%p → %p', (value, ms) => {
    expect(parseDuration(value)).toBe(ms);
  });
});
