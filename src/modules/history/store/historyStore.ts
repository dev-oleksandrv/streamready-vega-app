import {createJSONStorage, persist} from 'zustand/middleware';
import {createStore} from 'zustand/vanilla';

import {createLogger} from '~/shared/lib/logger';
import type {KeyValueStorage} from '~/shared/lib/storage';

import {
  addEntry,
  EMPTY_HISTORY,
  parseHistory,
  type HistoryData,
  type HistoryEntry,
} from '../domain/entry';

export const HISTORY_STORAGE_KEY = 'streamready.history';

export interface HistoryState extends HistoryData {
  /** Saves a finished test; ignored while history is off. */
  record: (entry: HistoryEntry) => void;
  setEnabled: (enabled: boolean) => void;
  /** Deletes every saved result; the on/off choice stays. */
  clear: () => void;
}

const log = createLogger('history');

export function createHistoryStore(storage: KeyValueStorage) {
  return createStore<HistoryState>()(
    persist(
      (set, get) => ({
        ...EMPTY_HISTORY,
        // Block bodies on purpose: persist's set returns the storage write promise,
        // which must not leak to callers.
        record: (entry) => {
          if (get().enabled) {
            set({entries: addEntry(get().entries, entry)});
          }
        },
        setEnabled: (enabled) => {
          set({enabled});
        },
        clear: () => {
          set({entries: []});
        },
      }),
      {
        name: HISTORY_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({
          enabled: state.enabled,
          entries: state.entries,
        }),
        merge: (persistedState, current) => ({
          ...current,
          ...parseHistory(persistedState),
        }),
        // zustand never rejects rehydrate(); read and parse errors arrive here.
        onRehydrateStorage: () => (_state, error) => {
          if (error) {
            log.warn('hydration failed', error);
          }
        },
        // Hydration runs explicitly from AppProviders, at launch.
        skipHydration: true,
      },
    ),
  );
}

export type HistoryStore = ReturnType<typeof createHistoryStore>;

/**
 * Loads the saved history. Resolves even on bad data: zustand routes errors to
 * onRehydrateStorage, and the history stays empty.
 */
export async function hydrateHistoryStore(store: HistoryStore): Promise<void> {
  await store.persist.rehydrate();
}
