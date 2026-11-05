import {expandMacros} from '~/modules/ads';

describe('expandMacros', () => {
  it.each([
    ['CACHEBUSTING', '04821937'],
    ['TIMESTAMP', '2026-11-05T20:08:00.000Z'],
    ['ERRORCODE', 303],
    ['SR_CATEGORY', 'laggy'],
    ['SR_WIDTH', 1920],
    ['SR_HEIGHT', 1080],
    ['SR_APP_ID', 'dev.voronkov.speedtest'],
    ['SR_APP_VERSION', '1.3.0'],
  ] as const)('replaces [%s]', (name, value) => {
    expect(
      expandMacros(`https://ads.example/tag?v=[${name}]`, {[name]: value}),
    ).toBe(`https://ads.example/tag?v=${encodeURIComponent(String(value))}`);
  });

  it('URL-encodes values', () => {
    expect(
      expandMacros('https://ads.example/tag?t=[TIMESTAMP]', {
        TIMESTAMP: '2026-11-05T20:08:00+01:00',
      }),
    ).toBe('https://ads.example/tag?t=2026-11-05T20%3A08%3A00%2B01%3A00');
  });

  it('replaces every occurrence', () => {
    expect(
      expandMacros('https://ads.example/[ERRORCODE]?c=[ERRORCODE]', {
        ERRORCODE: 402,
      }),
    ).toBe('https://ads.example/402?c=402');
  });

  it('sends an empty value as an empty string', () => {
    expect(
      expandMacros('https://ads.example/tag?cat=[SR_CATEGORY]&x=1', {
        SR_CATEGORY: '',
      }),
    ).toBe('https://ads.example/tag?cat=&x=1');
  });

  it('leaves unknown and unset macros untouched', () => {
    expect(
      expandMacros(
        'https://ads.example/tag?p=[CONTENTPLAYHEAD]&e=[ERRORCODE]&c=[CACHEBUSTING]',
        {CACHEBUSTING: '12345678'},
      ),
    ).toBe(
      'https://ads.example/tag?p=[CONTENTPLAYHEAD]&e=[ERRORCODE]&c=12345678',
    );
  });
});
