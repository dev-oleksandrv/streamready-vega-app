import {openSocket} from '~/modules/speedtest/engines/ndt7/socket';
import {
  fakeSocketFactory,
  type FakeWebSocket,
} from '../../../../support/FakeWebSocket';

const URL = 'wss://ndt-1.example/ndt/v7/download?access_token=REDACTED';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function open(signal = new AbortController().signal) {
  const factory = fakeSocketFactory();
  const promise = openSocket(factory.create, URL, {
    binaryType: 'arraybuffer',
    timeoutMs: 5_000,
    signal,
  });
  return {...factory, promise};
}

describe('openSocket', () => {
  it('resolves on open with subprotocol and binary type set', async () => {
    const {create, sockets, promise} = open();
    sockets[0].open();
    await expect(promise).resolves.toBe(sockets[0]);
    expect(create).toHaveBeenCalledWith(URL, 'net.measurementlab.ndt.v7');
    expect(sockets[0].binaryType).toBe('arraybuffer');
    expect(sockets[0].onopen).toBeNull();
    expect(sockets[0].onclose).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each([
    ['error', (s: FakeWebSocket) => s.fail()],
    ['close', (s: FakeWebSocket) => s.serverClose(1006)],
  ])('rejects connect_failed on %s before open', async (_name, trigger) => {
    const {sockets, promise} = open();
    trigger(sockets[0]);
    await expect(promise).rejects.toMatchObject({code: 'connect_failed'});
    expect(sockets[0].closeCalls).toHaveLength(1);
  });

  it('rejects connect_failed after the open timeout', async () => {
    const {sockets, promise} = open();
    const failure = promise.catch((error: unknown) => error);
    jest.advanceTimersByTime(5_000);
    expect(await failure).toMatchObject({code: 'connect_failed'});
    expect(sockets[0].closeCalls).toHaveLength(1);
  });

  it('rejects connect_failed when the constructor throws', async () => {
    const promise = openSocket(
      () => {
        throw new Error('bad url');
      },
      URL,
      {
        binaryType: 'arraybuffer',
        timeoutMs: 5_000,
        signal: new AbortController().signal,
      },
    );
    await expect(promise).rejects.toMatchObject({code: 'connect_failed'});
  });

  it('closes the socket when setting the binary type throws', async () => {
    const {create, sockets} = fakeSocketFactory();
    const promise = openSocket(
      (url, protocol) => {
        const socket = create(url, protocol);
        Object.defineProperty(socket, 'binaryType', {
          set: () => {
            throw new Error('Native module BlobModule is required');
          },
        });
        return socket;
      },
      URL,
      {
        binaryType: 'blob',
        timeoutMs: 5_000,
        signal: new AbortController().signal,
      },
    );
    await expect(promise).rejects.toMatchObject({code: 'connect_failed'});
    expect(sockets[0].closeCalls).toHaveLength(1);
  });

  it('rejects aborted and closes the socket on abort', async () => {
    const controller = new AbortController();
    const {sockets, promise} = open(controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({code: 'aborted'});
    expect(sockets[0].closeCalls).toHaveLength(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects aborted without creating a socket when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const {create, promise} = open(controller.signal);
    await expect(promise).rejects.toMatchObject({code: 'aborted'});
    expect(create).not.toHaveBeenCalled();
  });
});
