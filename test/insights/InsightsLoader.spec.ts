import { InsightsLoader } from '../../src/modules/insights/InsightsLoader';
import type { InsightsProvider } from '../../src/modules/insights/InsightsProvider';
import type { UserInsights } from '../../src/modules/insights/types';

const resolving = (name: string, insights: UserInsights): InsightsProvider => ({
  name,
  fetchInsights: jest.fn().mockResolvedValue(insights),
});

const rejecting = (name: string, error: unknown): InsightsProvider => ({
  name,
  fetchInsights: jest.fn().mockRejectedValue(error),
});

// Never settles on its own; rejects only when the loader aborts the signal.
const hanging = (name: string): InsightsProvider => ({
  name,
  fetchInsights: jest.fn(
    (signal?: AbortSignal) =>
      new Promise<UserInsights>((_resolve, reject) => {
        signal?.addEventListener('abort', () =>
          reject(new Error(`${name}: aborted`)),
        );
      }),
  ),
});

describe('InsightsLoader', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws when no providers are configured', async () => {
    const loader = new InsightsLoader([]);

    await expect(loader.loadInsights()).rejects.toThrow(
      'at least one provider should exist',
    );
  });

  it('returns the first provider result and skips the rest', async () => {
    const first = resolving('first', { ip: '1.1.1.1' });
    const second = resolving('second', { ip: '2.2.2.2' });

    const result = await new InsightsLoader([first, second]).loadInsights();

    expect(result).toEqual({ ip: '1.1.1.1' });
    expect(second.fetchInsights).not.toHaveBeenCalled();
  });

  it('falls back to the next provider when one fails', async () => {
    const first = rejecting('first', new Error('first: HTTP 429'));
    const second = resolving('second', { ip: '2.2.2.2' });

    const result = await new InsightsLoader([first, second]).loadInsights();

    expect(result).toEqual({ ip: '2.2.2.2' });
    expect(first.fetchInsights).toHaveBeenCalledTimes(1);
    expect(second.fetchInsights).toHaveBeenCalledTimes(1);
  });

  it('rethrows the last error when every provider fails', async () => {
    const loader = new InsightsLoader([
      rejecting('first', new Error('first failed')),
      rejecting('second', new Error('second failed')),
    ]);

    await expect(loader.loadInsights()).rejects.toThrow('second failed');
  });

  it('passes an AbortSignal to each provider', async () => {
    const provider = resolving('only', { ip: '1.1.1.1' });

    await new InsightsLoader([provider]).loadInsights();

    const [signal] = (provider.fetchInsights as jest.Mock).mock.calls[0];
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
  });

  it('aborts a slow provider after the timeout and falls back', async () => {
    jest.useFakeTimers();
    const slow = hanging('slow');
    const fast = resolving('fast', { ip: '2.2.2.2' });

    const promise = new InsightsLoader([slow, fast], {
      timeoutMs: 1_000,
    }).loadInsights();

    await jest.advanceTimersByTimeAsync(999);
    expect(fast.fetchInsights).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toEqual({ ip: '2.2.2.2' });
  });

  it('uses a 5 second timeout by default', async () => {
    jest.useFakeTimers();
    const provider = hanging('slow');
    const error = new InsightsLoader([provider]).loadInsights().catch((e) => e);
    const [signal] = (provider.fetchInsights as jest.Mock).mock.calls[0];

    await jest.advanceTimersByTimeAsync(4_999);
    expect(signal.aborted).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    expect(await error).toEqual(new Error('slow: aborted'));
  });

  it('treats an undefined timeoutMs as the default', async () => {
    jest.useFakeTimers();
    const provider = hanging('slow');
    const error = new InsightsLoader([provider], { timeoutMs: undefined })
      .loadInsights()
      .catch((e) => e);
    const [signal] = (provider.fetchInsights as jest.Mock).mock.calls[0];

    await jest.advanceTimersByTimeAsync(0);
    expect(signal.aborted).toBe(false);

    await jest.advanceTimersByTimeAsync(5_000);
    expect(await error).toEqual(new Error('slow: aborted'));
  });

  it('clears the timeout once a provider settles', async () => {
    jest.useFakeTimers();

    await new InsightsLoader([
      resolving('only', { ip: '1.1.1.1' }),
    ]).loadInsights();

    expect(jest.getTimerCount()).toBe(0);
  });
});
