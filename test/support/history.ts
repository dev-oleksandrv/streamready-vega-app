import {
  createHistoryStore,
  HISTORY_STORAGE_KEY,
  hydrateHistoryStore,
  type HistoryEntry,
  type HistoryStore,
} from '~/modules/history';
import {createMemoryStorage} from '~/shared/lib/storage';

/** A saved test with documentation-range geo data. */
export function historyEntry(
  finishedAt: number,
  over: Partial<HistoryEntry> = {},
): HistoryEntry {
  return {
    finishedAt,
    downloadBps: 186_400_000,
    uploadBps: 23_800_000,
    idleLatencyMs: 14,
    loadedLatencyMs: 52,
    grade: 'B',
    vpn: 'off',
    ip: '203.0.113.7',
    countryCode: 'DE',
    country: 'Germany',
    ...over,
  };
}

/** A memory-backed history store, already hydrated with `entries`. */
export async function createTestHistoryStore(
  entries: HistoryEntry[] = [],
  enabled = true,
): Promise<HistoryStore> {
  const storage = createMemoryStorage({
    [HISTORY_STORAGE_KEY]: JSON.stringify({
      state: {enabled, entries},
      version: 1,
    }),
  });
  const store = createHistoryStore(storage);
  await hydrateHistoryStore(store);
  return store;
}
