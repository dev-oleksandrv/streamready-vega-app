import {
  CONSENT_STORAGE_KEY,
  createConsentStore,
  hydrateConsentStore,
} from '~/modules/privacy';
import {
  createAsyncStorage,
  createMemoryStorage,
  type KeyValueStorage,
} from '~/shared/lib/storage';

const persisted = (status: string) =>
  JSON.stringify({state: {status}, version: 1});

const flush = () =>
  new Promise<void>((resolve) => setImmediate(() => resolve()));

describe('consentStore', () => {
  beforeEach(() => {
    // Failure paths log by design; keep the output clean.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  test.each([
    ['unknown status', persisted('yes')],
    ['invalid json', '{oops'],
    [
      'an old version',
      JSON.stringify({state: {status: 'accepted'}, version: 0}),
    ],
  ])('stays pending and writes nothing on %s', async (_name, raw) => {
    // zustand reports the unmigratable version through console.error.
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = createMemoryStorage({[CONSENT_STORAGE_KEY]: raw});
    const setItem = jest.spyOn(storage, 'setItem');
    const store = createConsentStore(storage);
    await hydrateConsentStore(store);
    expect(store.getState().status).toBe('pending');
    expect(setItem).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('logs when persisted data cannot be read', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createConsentStore(
      createMemoryStorage({[CONSENT_STORAGE_KEY]: '{oops'}),
    );
    await hydrateConsentStore(store);
    expect(warn).toHaveBeenCalledWith(
      '[consent]',
      'hydration failed',
      expect.any(String),
    );
    warn.mockRestore();
  });

  it('keeps the in-memory status when the backend rejects a write', async () => {
    const adapter = createAsyncStorage({
      getItem: jest.fn().mockResolvedValue(null),
      setItem: jest.fn().mockRejectedValue(new Error('disk full')),
      removeItem: jest.fn().mockResolvedValue(undefined),
    });
    // Capture the write promises zustand fires without awaiting.
    const writes: Promise<void>[] = [];
    const storage: KeyValueStorage = {
      ...adapter,
      setItem: (key, value) => {
        const write = adapter.setItem(key, value);
        writes.push(write);
        return write;
      },
    };
    const store = createConsentStore(storage);
    await hydrateConsentStore(store);
    store.getState().accept();
    expect(store.getState().status).toBe('accepted');
    expect(writes).toHaveLength(1);
    // A rejection here would surface as an unhandled promise in the app.
    await expect(Promise.all(writes)).resolves.toEqual([undefined]);
  });
});
