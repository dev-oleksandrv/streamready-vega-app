import {createAsyncStorage, createMemoryStorage} from '~/shared/lib/storage';

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

describe('createAsyncStorage', () => {
  beforeEach(() => {
    // Failures are logged by design; keep the test output clean.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeBackend = () => ({
    getItem: jest.fn().mockResolvedValue('v'),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  });

  it('delegates to the backend', async () => {
    const backend = makeBackend();
    const storage = createAsyncStorage(backend);
    expect(await storage.getItem('k')).toBe('v');
    await storage.setItem('k', 'x');
    await storage.removeItem('k');
    expect(backend.getItem).toHaveBeenCalledWith('k');
    expect(backend.setItem).toHaveBeenCalledWith('k', 'x');
    expect(backend.removeItem).toHaveBeenCalledWith('k');
  });

  it('returns null when a read fails', async () => {
    const backend = makeBackend();
    backend.getItem.mockRejectedValue(new Error('disk'));
    await expect(createAsyncStorage(backend).getItem('k')).resolves.toBeNull();
  });

  it('swallows write and remove failures', async () => {
    const backend = makeBackend();
    backend.setItem.mockRejectedValue(new Error('disk full'));
    backend.removeItem.mockRejectedValue(new Error('disk'));
    const storage = createAsyncStorage(backend);
    await expect(storage.setItem('k', 'x')).resolves.toBeUndefined();
    await expect(storage.removeItem('k')).resolves.toBeUndefined();
  });
});
