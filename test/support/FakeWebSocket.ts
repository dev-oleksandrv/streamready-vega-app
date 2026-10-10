import type {
  BinaryMode,
  Ndt7Socket,
} from '~/modules/speedtest/engines/ndt7/socket';

/** Mirrors Vega's Blob: `size` throws once `close()` released the data. */
export class FakeBlob {
  private data: {size: number} | null;
  readonly close = jest.fn(() => {
    this.data = null;
  });

  constructor(size: number) {
    this.data = {size};
  }

  get size(): number {
    if (!this.data) {
      throw new Error('Blob has been closed and is no longer available');
    }
    return this.data.size;
  }
}

/** Scriptable stand-in for the platform WebSocket. Records sizes, never payload copies. */
export class FakeWebSocket implements Ndt7Socket {
  binaryType: BinaryMode = 'blob';
  bufferedAmount?: number;
  onopen: (() => void) | null = null;
  onmessage: ((event: {data: unknown}) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: ((event: {code?: number}) => void) | null = null;

  readonly sentSizes: number[] = [];
  readonly sentBuffers = new Set<ArrayBuffer>();
  readonly closeCalls: Array<number | undefined> = [];
  throwOnSend = false;

  constructor(readonly url: string, readonly protocol: string) {}

  get totalSent(): number {
    return this.sentSizes.reduce((sum, n) => sum + n, 0);
  }

  send(data: ArrayBuffer): void {
    if (this.throwOnSend) {
      throw new Error('INVALID_STATE_ERR');
    }
    this.sentSizes.push(data.byteLength);
    this.sentBuffers.add(data);
  }

  close(code?: number): void {
    this.closeCalls.push(code);
  }

  // Test drivers
  open(): void {
    this.onopen?.();
  }

  receive(data: unknown): void {
    this.onmessage?.({data});
  }

  serverClose(code = 1000): void {
    this.onclose?.({code});
  }

  fail(): void {
    this.onerror?.(new Error('fake socket error'));
  }
}

export function fakeSocketFactory() {
  const sockets: FakeWebSocket[] = [];
  const create = jest.fn((url: string, protocol: string) => {
    const socket = new FakeWebSocket(url, protocol);
    sockets.push(socket);
    return socket;
  });
  return {create, sockets};
}
