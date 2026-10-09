import {createJSONStorage, persist} from 'zustand/middleware';
import {createStore} from 'zustand/vanilla';

import {createLogger} from '~/shared/lib/logger';
import type {KeyValueStorage} from '~/shared/lib/storage';

import {parseConsentStatus, type ConsentStatus} from '../domain/consent';

export const CONSENT_STORAGE_KEY = 'streamready.consent';

export interface ConsentState {
  status: ConsentStatus;
  accept: () => void;
  withdraw: () => void;
}

const log = createLogger('consent');

export function createConsentStore(storage: KeyValueStorage) {
  return createStore<ConsentState>()(
    persist(
      (set) => ({
        status: 'pending',
        // Block bodies on purpose: persist's set returns the storage write promise,
        // which must not leak to callers.
        accept: () => {
          set({status: 'accepted'});
        },
        withdraw: () => {
          set({status: 'withdrawn'});
        },
      }),
      {
        name: CONSENT_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: (state) => ({status: state.status}),
        // Never trust disk: unknown values become `pending`, so the gate shows.
        merge: (persistedState, current) => ({
          ...current,
          status: parseConsentStatus(persistedState),
        }),
        // zustand never rejects rehydrate(); read and parse errors arrive here.
        onRehydrateStorage: () => (_state, error) => {
          if (error) {
            log.warn('hydration failed', error);
          }
        },
        // Hydration runs explicitly from ConsentProvider so the splash can wait for it.
        skipHydration: true,
      },
    ),
  );
}

export type ConsentStore = ReturnType<typeof createConsentStore>;

/**
 * Loads persisted consent. Resolves even on bad data: zustand routes errors to
 * onRehydrateStorage, and the status stays `pending`.
 */
export async function hydrateConsentStore(store: ConsentStore): Promise<void> {
  await store.persist.rehydrate();
}
