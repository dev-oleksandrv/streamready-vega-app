import {
  CONSENT_STORAGE_KEY,
  createConsentStore,
  hydrateConsentStore,
  type ConsentStatus,
  type ConsentStore,
} from '~/modules/privacy';
import {createMemoryStorage} from '~/shared/lib/storage';

/** A memory-backed consent store, already hydrated with `status`. */
export async function createTestConsentStore(
  status: ConsentStatus = 'pending',
): Promise<ConsentStore> {
  const storage = createMemoryStorage({
    [CONSENT_STORAGE_KEY]: JSON.stringify({state: {status}, version: 1}),
  });
  const store = createConsentStore(storage);
  await hydrateConsentStore(store);
  return store;
}
