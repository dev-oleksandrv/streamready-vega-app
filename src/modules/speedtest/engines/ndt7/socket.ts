import {SpeedTestError} from '../../domain/errors';
import {NDT7_SUBPROTOCOL} from './protocol';

export type BinaryMode = 'arraybuffer' | 'blob';

/** The subset of the platform WebSocket the engine uses. */
export interface Ndt7Socket {
  binaryType: BinaryMode;
  /** Declared but never updated by Vega's WebSocket; honored only when numeric. */
  readonly bufferedAmount?: number;
  onopen: (() => void) | null;
  onmessage: ((event: {data: unknown}) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: {code?: number}) => void) | null;
  send(data: ArrayBuffer): void;
  close(code?: number): void;
}

export type CreateSocket = (url: string, protocol: string) => Ndt7Socket;

export interface OpenSocketOptions {
  binaryType: BinaryMode;
  timeoutMs: number;
  signal: AbortSignal;
}

export function detach(socket: Ndt7Socket): void {
  socket.onopen = null;
  socket.onmessage = null;
  socket.onerror = null;
  socket.onclose = null;
}

export function closeQuietly(socket: Ndt7Socket, code?: number): void {
  try {
    socket.close(code);
  } catch {
    // Already closed or never connected: nothing left to release.
  }
}

/** Resolves once the socket is open, with its handlers cleared for the next phase. */
export function openSocket(
  createSocket: CreateSocket,
  url: string,
  {binaryType, timeoutMs, signal}: OpenSocketOptions,
): Promise<Ndt7Socket> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new SpeedTestError('aborted'));
      return;
    }
    let socket: Ndt7Socket;
    try {
      socket = createSocket(url, NDT7_SUBPROTOCOL);
      socket.binaryType = binaryType;
    } catch {
      reject(new SpeedTestError('connect_failed'));
      return;
    }

    const timer = setTimeout(
      () => settle(new SpeedTestError('connect_failed')),
      timeoutMs,
    );
    const onAbort = () => settle(new SpeedTestError('aborted'));
    signal.addEventListener('abort', onAbort);
    socket.onopen = () => settle();
    socket.onerror = () => settle(new SpeedTestError('connect_failed'));
    socket.onclose = () => settle(new SpeedTestError('connect_failed'));

    function settle(error?: SpeedTestError) {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      detach(socket);
      if (error) {
        closeQuietly(socket);
        reject(error);
      } else {
        resolve(socket);
      }
    }
  });
}
