import type {
  ConnectionInfo,
  GeoIpProvider,
} from '~/modules/insights/domain/connection';
import {fallbackChain} from '~/modules/insights/providers/fallbackChain';
import {HttpError} from '~/shared/lib/http';

const A: ConnectionInfo = {
  ip: '203.0.113.7',
  countryCode: 'DE',
  country: 'Germany',
};
const B: ConnectionInfo = {
  ip: '203.0.113.8',
  countryCode: 'FR',
  country: 'France',
};

const ok = (id: string, info: ConnectionInfo): GeoIpProvider => ({
  id,
  lookup: jest.fn().mockResolvedValue(info),
});
const failing = (
  id: string,
  kind: 'parse' | 'network' = 'network',
): GeoIpProvider => ({
  id,
  lookup: jest.fn().mockRejectedValue(new HttpError(kind)),
});
/** Never settles and ignores its signal: the worst-behaved provider. */
const hanging = (id: string): GeoIpProvider => ({
  id,
  lookup: jest.fn(() => new Promise<ConnectionInfo>(() => {})),
});

const signal = () => new AbortController().signal;

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('fallbackChain', () => {
  it('returns the first provider result and skips the rest', async () => {
    const second = ok('b', B);
    await expect(
      fallbackChain([ok('a', A), second], {timeoutMs: 5000}).lookup(signal()),
    ).resolves.toBe(A);
    expect(second.lookup).not.toHaveBeenCalled();
  });

  it('first fails, second wins', async () => {
    await expect(
      fallbackChain([failing('a', 'parse'), ok('b', B)], {
        timeoutMs: 5000,
      }).lookup(signal()),
    ).resolves.toBe(B);
  });

  it('rejects with the last error when all fail', async () => {
    await expect(
      fallbackChain([failing('a', 'parse'), failing('b', 'network')], {
        timeoutMs: 5000,
      }).lookup(signal()),
    ).rejects.toMatchObject({kind: 'network'});
  });

  it('settles at the deadline even if a provider ignores abort', async () => {
    jest.useFakeTimers();
    const second = ok('b', B);
    const pending = fallbackChain([hanging('a'), second], {
      timeoutMs: 5000,
    }).lookup(signal());
    jest.advanceTimersByTime(5000);
    await expect(pending).rejects.toMatchObject({kind: 'timeout'});
    expect(second.lookup).not.toHaveBeenCalled();
  });

  it('shares one deadline across providers', async () => {
    jest.useFakeTimers();
    const slowFail: GeoIpProvider = {
      id: 'a',
      lookup: () =>
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new HttpError('network')), 4000),
        ),
    };
    const pending = fallbackChain([slowFail, hanging('b')], {
      timeoutMs: 5000,
    }).lookup(signal());
    jest.advanceTimersByTime(4000);
    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await expect(pending).rejects.toMatchObject({kind: 'timeout'});
  });

  it('passes an aborting signal to providers at the deadline', async () => {
    jest.useFakeTimers();
    let seen: AbortSignal | undefined;
    const spy: GeoIpProvider = {
      id: 'a',
      lookup: (s) => {
        seen = s;
        return new Promise(() => {});
      },
    };
    const pending = fallbackChain([spy], {timeoutMs: 5000}).lookup(signal());
    jest.advanceTimersByTime(5000);
    await expect(pending).rejects.toBeInstanceOf(HttpError);
    expect(seen?.aborted).toBe(true);
  });

  it('stops when the caller aborts', async () => {
    const controller = new AbortController();
    const second = ok('b', B);
    const pending = fallbackChain([hanging('a'), second], {
      timeoutMs: 5000,
    }).lookup(controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({kind: 'aborted'});
    expect(second.lookup).not.toHaveBeenCalled();
  });

  it('leaves no timer behind after settling', async () => {
    jest.useFakeTimers();
    await fallbackChain([ok('a', A)], {timeoutMs: 5000}).lookup(signal());
    expect(jest.getTimerCount()).toBe(0);
  });
});
