import {addEntry, HISTORY_LIMIT, parseHistory} from '~/modules/history';

import {historyEntry as entry} from '../../../support/history';

describe('addEntry', () => {
  it('puts the newest entry first', () => {
    expect(addEntry([entry(1)], entry(2)).map((e) => e.finishedAt)).toEqual([
      2, 1,
    ]);
  });

  it(`keeps only the ${HISTORY_LIMIT} latest`, () => {
    const full = Array.from({length: HISTORY_LIMIT}, (_, i) =>
      entry(HISTORY_LIMIT - i),
    );
    const next = addEntry(full, entry(HISTORY_LIMIT + 1));
    expect(next).toHaveLength(HISTORY_LIMIT);
    expect(next[0]?.finishedAt).toBe(HISTORY_LIMIT + 1);
    expect(next.at(-1)?.finishedAt).toBe(2);
  });
});

describe('parseHistory', () => {
  it('reads a stored history', () => {
    const entries = [entry(2), entry(1, {vpn: 'on', ip: undefined})];
    expect(parseHistory({enabled: false, entries})).toEqual({
      enabled: false,
      entries,
    });
  });

  it('keeps an entry without geo insights', () => {
    const bare = entry(1, {
      ip: undefined,
      countryCode: undefined,
      country: undefined,
    });
    expect(parseHistory({enabled: true, entries: [bare]}).entries).toEqual([
      bare,
    ]);
  });

  test.each([
    ['nothing', undefined],
    ['null', null],
    ['an array', []],
    ['a string', 'yes'],
  ])('falls back to an empty, enabled history on %s', (_name, raw) => {
    expect(parseHistory(raw)).toEqual({enabled: true, entries: []});
  });

  it('defaults enabled when the flag is not a boolean', () => {
    expect(parseHistory({enabled: 'no', entries: []}).enabled).toBe(true);
  });

  test.each<[string, Record<string, unknown>]>([
    ['a missing time', {finishedAt: undefined}],
    ['a negative speed', {downloadBps: -1}],
    ['a non-finite latency', {idleLatencyMs: Number.POSITIVE_INFINITY}],
    ['an unknown grade', {grade: 'E'}],
    ['an unknown vpn state', {vpn: 'maybe'}],
    ['a numeric ip', {ip: 7}],
  ])('drops an entry with %s', (_name, over) => {
    const bad = {...entry(1), ...over};
    expect(
      parseHistory({enabled: true, entries: [entry(2), bad]}).entries,
    ).toEqual([entry(2)]);
  });

  it('drops unknown fields', () => {
    const extra = {...entry(1), access_token: 'x'};
    expect(parseHistory({entries: [extra]}).entries).toEqual([entry(1)]);
  });

  it('orders newest first and caps the length', () => {
    const many = Array.from({length: HISTORY_LIMIT + 5}, (_, i) => entry(i));
    const {entries} = parseHistory({entries: many});
    expect(entries).toHaveLength(HISTORY_LIMIT);
    expect(entries[0]?.finishedAt).toBe(HISTORY_LIMIT + 4);
  });
});
