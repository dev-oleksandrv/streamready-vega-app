import {createVastClient} from '~/modules/ads';
import {HttpError} from '~/shared/lib/http';
import {createLogger} from '~/shared/lib/logger';

import {
  EMPTY_WITH_ERROR,
  INLINE_LINEAR,
  INLINE_NONLINEAR,
  INLINE_STREAMING_ONLY,
  MALFORMED,
  wrapperXml,
} from '../../../support/fixtures/vast';

const TAG =
  'https://ads.example/tag?cat=[SR_CATEGORY]&cb=[CACHEBUSTING]&t=[TIMESTAMP]';
const T0 = Date.UTC(2026, 10, 5, 20, 0, 0);

type Responder = (url: string) => string | Error;

function setup(respond: Responder, opts: {clock?: number[]} = {}) {
  let time = T0;
  const sink = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const fetchText = jest.fn(
    async (url: string, _opts: {timeoutMs: number; signal?: AbortSignal}) => {
      const step = opts.clock?.shift();
      if (step !== undefined) {
        time += step;
      }
      const out = respond(url);
      if (out instanceof Error) {
        throw out;
      }
      return out;
    },
  );
  const client = createVastClient({
    fetchText,
    now: () => time,
    random: () => 0.04821937,
    logger: createLogger('ads', {enabled: true, sink}),
  });
  const logged = () =>
    JSON.stringify(Object.values(sink).flatMap((fn) => fn.mock.calls));
  return {client, fetchText, logged};
}

const load = (
  client: ReturnType<typeof createVastClient>,
  slot: 'result' | 'home' | 'video' = 'result',
  signal?: AbortSignal,
) => client.load({tagUrl: TAG, slot, macros: {SR_CATEGORY: 'laggy'}, signal});

/** Serves `chain[i]` for the i-th request. */
const sequence = (...chain: string[]): Responder => {
  let i = 0;
  return () => chain[i++] ?? '';
};

describe('vastClient', () => {
  it('requests the tag with macros filled in and returns the creative', async () => {
    const {client, fetchText} = setup(() => INLINE_NONLINEAR);
    const result = await load(client);
    expect(result).toMatchObject({
      kind: 'ad',
      creative: {id: 'kestrel-card-1'},
    });
    expect(fetchText).toHaveBeenCalledTimes(1);
    expect(fetchText.mock.calls[0]?.[0]).toBe(
      'https://ads.example/tag?cat=laggy&cb=04821937&t=2026-11-05T20%3A00%3A00.000Z',
    );
    expect(fetchText.mock.calls[0]?.[1]).toMatchObject({timeoutMs: 1500});
  });

  it('follows wrappers, filling macros in their URLs, and merges trackers', async () => {
    const {client, fetchText} = setup(
      sequence(
        wrapperXml('https://ads.example/next?cb=[CACHEBUSTING]'),
        INLINE_LINEAR,
      ),
    );
    const result = await load(client, 'video');
    expect(fetchText.mock.calls[1]?.[0]).toBe(
      'https://ads.example/next?cb=04821937',
    );
    expect(result).toMatchObject({
      kind: 'ad',
      creative: {
        impressions: [
          'https://ads.example/imp/wrapper-1',
          'https://ads.example/imp/lumen?cb=[CACHEBUSTING]',
        ],
      },
    });
  });

  it('follows up to 3 wrappers', async () => {
    const {client, fetchText} = setup(
      sequence(wrapperXml(), wrapperXml(), wrapperXml(), INLINE_NONLINEAR),
    );
    await expect(load(client)).resolves.toMatchObject({kind: 'ad'});
    expect(fetchText).toHaveBeenCalledTimes(4);
  });

  it('stops at a 4th wrapper with error 302 and every wrapper error tracker', async () => {
    const chain = [1, 2, 3, 4].map((n) => wrapperXml(undefined, n));
    const {client, fetchText} = setup(sequence(...chain, INLINE_NONLINEAR));
    await expect(load(client)).resolves.toEqual({
      kind: 'none',
      error: {
        code: 302,
        urls: [1, 2, 3, 4].map(
          (n) => `https://ads.example/err/wrapper-${n}?code=[ERRORCODE]`,
        ),
      },
    });
    expect(fetchText).toHaveBeenCalledTimes(4);
  });

  it('reports no fill with 303 and the root error tracker', async () => {
    const {client} = setup(() => EMPTY_WITH_ERROR);
    await expect(load(client)).resolves.toEqual({
      kind: 'none',
      error: {
        code: 303,
        urls: ['https://ads.example/err/nofill?code=[ERRORCODE]'],
      },
    });
  });

  it('reports a creative the slot cannot use', async () => {
    const {client} = setup(() => INLINE_STREAMING_ONLY);
    await expect(load(client, 'video')).resolves.toMatchObject({
      kind: 'none',
      error: {code: 403},
    });
  });

  it('reports malformed XML from a wrapper target as 100 to the wrapper', async () => {
    const {client} = setup(sequence(wrapperXml(), MALFORMED));
    await expect(load(client)).resolves.toEqual({
      kind: 'none',
      error: {
        code: 100,
        urls: ['https://ads.example/err/wrapper-1?code=[ERRORCODE]'],
      },
    });
  });

  it('refuses an oversized response as 100', async () => {
    const {client} = setup(
      () => `<VAST version="3.0">${' '.repeat(300_000)}</VAST>`,
    );
    await expect(load(client)).resolves.toMatchObject({
      kind: 'none',
      error: {code: 100},
    });
  });

  it('gives no error for a failed first request: there is nothing to report to', async () => {
    const {client} = setup(() => new HttpError('network'));
    await expect(load(client)).resolves.toEqual({kind: 'none'});
  });

  it.each([
    [new HttpError('timeout'), 301],
    [new HttpError('status', 500), 300],
  ])('reports a failed wrapper request (%s) as %i', async (error, code) => {
    const {client} = setup((url) =>
      url.includes('/next') ? error : wrapperXml('https://ads.example/next'),
    );
    await expect(load(client)).resolves.toEqual({
      kind: 'none',
      error: {
        code,
        urls: ['https://ads.example/err/wrapper-1?code=[ERRORCODE]'],
      },
    });
  });

  it('shrinks the hop timeout to what is left of 3 s, then gives up with 301', async () => {
    const {client, fetchText} = setup(
      sequence(wrapperXml(), wrapperXml(), INLINE_NONLINEAR),
      {clock: [1000, 2000]},
    );
    await expect(load(client)).resolves.toMatchObject({
      kind: 'none',
      error: {code: 301},
    });
    expect(fetchText.mock.calls.map((c) => c[1].timeoutMs)).toEqual([
      1500, 1500,
    ]);
  });

  it('passes the remaining budget when it is under 1.5 s', async () => {
    const {client, fetchText} = setup(
      sequence(wrapperXml(), INLINE_NONLINEAR),
      {
        clock: [2200],
      },
    );
    await expect(load(client)).resolves.toMatchObject({kind: 'ad'});
    expect(fetchText.mock.calls.map((c) => c[1].timeoutMs)).toEqual([
      1500, 800,
    ]);
  });

  it('returns nothing and stops when aborted', async () => {
    const controller = new AbortController();
    const {client, fetchText} = setup((url) => {
      controller.abort();
      return url.includes('next')
        ? INLINE_NONLINEAR
        : wrapperXml('https://ads.example/next');
    });
    await expect(load(client, 'result', controller.signal)).resolves.toEqual({
      kind: 'none',
    });
    expect(fetchText).toHaveBeenCalledTimes(1);
    expect(fetchText.mock.calls[0]?.[1].signal).toBe(controller.signal);
  });

  it('treats a request rejected after abort as aborted, not as an error', async () => {
    const controller = new AbortController();
    const {client} = setup((url) => {
      if (url.includes('/next')) {
        controller.abort();
        return new HttpError('aborted');
      }
      return wrapperXml('https://ads.example/next');
    });
    await expect(load(client, 'result', controller.signal)).resolves.toEqual({
      kind: 'none',
    });
  });

  it('never logs a URL', async () => {
    const runs: Responder[] = [
      () => INLINE_NONLINEAR,
      () => EMPTY_WITH_ERROR,
      () => new HttpError('network'),
      sequence(wrapperXml(), MALFORMED),
    ];
    for (const respond of runs) {
      const {client, logged} = setup(respond);
      await load(client);
      expect(logged()).not.toMatch(/example|https?:/);
      expect(logged()).not.toBe('[]');
    }
  });
});
