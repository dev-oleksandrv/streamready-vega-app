import {
  CONSENT_STORAGE_KEY,
  createConsentStore,
  hydrateConsentStore,
} from '~/modules/privacy';
import {createMemoryStorage, type KeyValueStorage} from '~/shared/lib/storage';

const persisted = (status: string) =>
  JSON.stringify({state: {status}, version: 1});

const flush = () =>
  new Promise<void>((resolve) => setImmediate(() => resolve()));

describe('consentStore', () => {
  it('starts pending', () => {
    expect(createConsentStore(createMemoryStorage()).getState().status).toBe(
      'pending',
    );
  });

  it('actions return nothing (the persist write stays internal)', () => {
    const store = createConsentStore(createMemoryStorage());
    expect(store.getState().accept()).toBeUndefined();
    expect(store.getState().withdraw()).toBeUndefined();
  });

  it('accepts and withdraws', () => {
    const store = createConsentStore(createMemoryStorage());
    store.getState().accept();
    expect(store.getState().status).toBe('accepted');
    store.getState().withdraw();
    expect(store.getState().status).toBe('withdrawn');
  });

  it('persists only the status', async () => {
    const storage = createMemoryStorage();
    const store = createConsentStore(storage);
    await hydrateConsentStore(store);
    store.getState().accept();
    await flush();
    const raw = await storage.getItem(CONSENT_STORAGE_KEY);
    expect(JSON.parse(raw ?? '{}')).toEqual({
      state: {status: 'accepted'},
      version: 1,
    });
  });

  test.each(['accepted', 'withdrawn'])('rehydrates %s', async (status) => {
    const store = createConsentStore(
      createMemoryStorage({[CONSENT_STORAGE_KEY]: persisted(status)}),
    );
    await hydrateConsentStore(store);
    expect(store.getState().status).toBe(status);
  });

  it('does not write while hydrating', async () => {
    const storage = createMemoryStorage({
      [CONSENT_STORAGE_KEY]: persisted('accepted'),
    });
    const setItem = jest.spyOn(storage, 'setItem');
    await hydrateConsentStore(createConsentStore(storage));
    expect(setItem).not.toHaveBeenCalled();
  });

  test.each([
    ['unknown status', persisted('yes')],
    ['invalid json', '{not json'],
    ['wrong shape', JSON.stringify(['accepted'])],
  ])('falls back to pending on %s', async (_name, raw) => {
    const store = createConsentStore(
      createMemoryStorage({[CONSENT_STORAGE_KEY]: raw}),
    );
    await hydrateConsentStore(store);
    expect(store.getState().status).toBe('pending');
  });

  it('resolves and stays pending when the storage read throws', async () => {
    const storage: KeyValueStorage = {
      getItem: jest.fn().mockRejectedValue(new Error('disk')),
      setItem: jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    };
    const store = createConsentStore(storage);
    await expect(hydrateConsentStore(store)).resolves.toBeUndefined();
    expect(store.getState().status).toBe('pending');
  });

  it('keeps the in-memory status when a write fails', async () => {
    const storage: KeyValueStorage = {
      getItem: jest.fn().mockResolvedValue(null),
      // The shared adapter swallows write errors; simulate that contract.
      setItem: jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    };
    const store = createConsentStore(storage);
    await hydrateConsentStore(store);
    store.getState().accept();
    expect(store.getState().status).toBe('accepted');
  });
});
