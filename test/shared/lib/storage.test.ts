import {createMemoryStorage, createMmkvStorage} from '~/shared/lib/storage';

describe('createMemoryStorage', () => {
  it('round-trips and removes values', async () => {
    const storage = createMemoryStorage({a: '1'});
    expect(await storage.getItem('a')).toBe('1');
    await storage.setItem('b', '2');
    expect(await storage.getItem('b')).toBe('2');
    await storage.removeItem('a');
    expect(await storage.getItem('a')).toBeNull();
  });
});

describe('createMmkvStorage', () => {
  beforeEach(() => {
    // Failures are logged by design; keep the test output clean.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeBackend = () => {
    const data = new Map<string, string>();
    return {
      getString: jest.fn((key: string) => data.get(key)),
      set: jest.fn((key: string, value: string) => {
        data.set(key, value);
      }),
      delete: jest.fn((key: string) => {
        data.delete(key);
      }),
    };
  };

  it('round-trips through the backend', async () => {
    const backend = makeBackend();
    const storage = createMmkvStorage(() => backend);
    expect(await storage.getItem('k')).toBeNull();
    await storage.setItem('k', 'x');
    expect(backend.set).toHaveBeenCalledWith('k', 'x');
    expect(await storage.getItem('k')).toBe('x');
    await storage.removeItem('k');
    expect(await storage.getItem('k')).toBeNull();
  });

  it('keeps values across instances on the same backend (app relaunch)', async () => {
    const backend = makeBackend();
    await createMmkvStorage(() => backend).setItem('k', 'x');
    expect(await createMmkvStorage(() => backend).getItem('k')).toBe('x');
  });

  it('returns null when a read throws', async () => {
    const backend = makeBackend();
    backend.getString.mockImplementation(() => {
      throw new Error('disk');
    });
    await expect(
      createMmkvStorage(() => backend).getItem('k'),
    ).resolves.toBeNull();
  });

  it('swallows write and remove failures', async () => {
    const backend = makeBackend();
    backend.set.mockImplementation(() => {
      throw new Error('disk full');
    });
    backend.delete.mockImplementation(() => {
      throw new Error('disk');
    });
    const storage = createMmkvStorage(() => backend);
    await expect(storage.setItem('k', 'x')).resolves.toBeUndefined();
    await expect(storage.removeItem('k')).resolves.toBeUndefined();
  });

  it('falls back to memory when the native module fails to open', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = createMmkvStorage(() => {
      throw new Error('MmkvCxx not found');
    });
    await storage.setItem('k', 'x');
    expect(await storage.getItem('k')).toBe('x');
    expect(warn).toHaveBeenCalledWith(
      '[storage]',
      'mmkv unavailable',
      expect.any(String),
    );
  });
});
