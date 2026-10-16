import {
  createHistoryStore,
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
  hydrateHistoryStore,
  type HistoryEntry,
} from '~/modules/history';
import {
  createMemoryStorage,
  createMmkvStorage,
  type KeyValueStorage,
} from '~/shared/lib/storage';

import {historyEntry} from '../../../support/history';

const flush = () =>
  new Promise<void>((resolve) => setImmediate(() => resolve()));

const persisted = (enabled: boolean, entries: HistoryEntry[]) =>
  JSON.stringify({state: {enabled, entries}, version: 1});

async function hydrated(storage = createMemoryStorage()) {
  const store = createHistoryStore(storage);
  await hydrateHistoryStore(store);
  return store;
}

describe('historyStore', () => {
  beforeEach(() => {
    // Failure paths log by design; keep the output clean.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts empty and on', async () => {
    const store = await hydrated();
    expect(store.getState().enabled).toBe(true);
    expect(store.getState().entries).toEqual([]);
  });

  it('records newest first', async () => {
    const store = await hydrated();
    store.getState().record(historyEntry(1));
    store.getState().record(historyEntry(2));
    expect(store.getState().entries.map((e) => e.finishedAt)).toEqual([2, 1]);
  });

  it(`keeps the ${HISTORY_LIMIT} latest`, async () => {
    const store = await hydrated();
    for (let i = 1; i <= HISTORY_LIMIT + 1; i++) {
      store.getState().record(historyEntry(i));
    }
    expect(store.getState().entries).toHaveLength(HISTORY_LIMIT);
    expect(store.getState().entries.at(-1)?.finishedAt).toBe(2);
  });

  it('does not record while off, and keeps saved results', async () => {
    const store = await hydrated();
    store.getState().record(historyEntry(1));
    store.getState().setEnabled(false);
    store.getState().record(historyEntry(2));
    expect(store.getState().entries.map((e) => e.finishedAt)).toEqual([1]);
  });

  it('clear deletes every result and keeps the switch', async () => {
    const store = await hydrated();
    store.getState().record(historyEntry(1));
    store.getState().setEnabled(false);
    store.getState().clear();
    expect(store.getState().entries).toEqual([]);
    expect(store.getState().enabled).toBe(false);
  });

  it('actions return nothing (the persist write stays internal)', async () => {
    const store = await hydrated();
    expect(store.getState().record(historyEntry(1))).toBeUndefined();
    expect(store.getState().setEnabled(true)).toBeUndefined();
    expect(store.getState().clear()).toBeUndefined();
  });

  it('persists the switch and the entries', async () => {
    const storage = createMemoryStorage();
    const store = await hydrated(storage);
    store.getState().record(historyEntry(1));
    store.getState().setEnabled(false);
    await flush();
    const raw = await storage.getItem(HISTORY_STORAGE_KEY);
    expect(JSON.parse(raw ?? '{}')).toEqual({
      state: {enabled: false, entries: [historyEntry(1)]},
      version: 1,
    });
  });

  it('rehydrates a saved history', async () => {
    const store = await hydrated(
      createMemoryStorage({
        [HISTORY_STORAGE_KEY]: persisted(false, [
          historyEntry(2),
          historyEntry(1),
        ]),
      }),
    );
    expect(store.getState().enabled).toBe(false);
    expect(store.getState().entries).toEqual([
      historyEntry(2),
      historyEntry(1),
    ]);
  });

  it('drops bad entries from disk', async () => {
    const raw = JSON.stringify({
      state: {enabled: true, entries: [historyEntry(1), {grade: 'Z'}]},
      version: 1,
    });
    const store = await hydrated(
      createMemoryStorage({[HISTORY_STORAGE_KEY]: raw}),
    );
    expect(store.getState().entries).toEqual([historyEntry(1)]);
  });

  test.each([
    ['invalid json', '{oops'],
    ['wrong shape', JSON.stringify(['x'])],
  ])('stays empty on %s', async (_name, raw) => {
    const store = await hydrated(
      createMemoryStorage({[HISTORY_STORAGE_KEY]: raw}),
    );
    expect(store.getState().entries).toEqual([]);
    expect(store.getState().enabled).toBe(true);
  });

  it('resolves and stays empty when the storage read throws', async () => {
    const storage: KeyValueStorage = {
      getItem: jest.fn().mockRejectedValue(new Error('disk')),
      setItem: jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    };
    const store = createHistoryStore(storage);
    await expect(hydrateHistoryStore(store)).resolves.toBeUndefined();
    expect(store.getState().entries).toEqual([]);
  });

  it('survives a relaunch on the same MMKV backend', async () => {
    const data = new Map<string, string>();
    const backend = () => ({
      getString: (key: string) => data.get(key),
      set: (key: string, value: string) => {
        data.set(key, value);
      },
      delete: (key: string) => {
        data.delete(key);
      },
    });
    const first = await hydrated(createMmkvStorage(backend));
    first.getState().record(historyEntry(1));
    await Promise.resolve();

    const relaunched = await hydrated(createMmkvStorage(backend));
    expect(relaunched.getState().entries).toEqual([historyEntry(1)]);
  });
});
