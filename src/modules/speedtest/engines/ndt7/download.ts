import type {EngineEvent} from '../../domain/engine';
import {isSpeedTestError, SpeedTestError} from '../../domain/errors';
import {
  DOWNLOAD_TIMEOUT_MS,
  isCloseFrameEcho,
  NORMAL_CLOSE,
  parseMeasurement,
  SAMPLE_INTERVAL_MS,
} from './protocol';
import {bitsPerSecond, DownloadLatency} from './measurements';
import {closeQuietly, detach, type Ndt7Socket} from './socket';

export interface PhaseOptions {
  now: () => number;
  signal: AbortSignal;
  onEvent: (event: EngineEvent) => void;
}

export interface DownloadOutcome {
  bytes: number;
  /** Binary and text messages received; JS-thread load on Vega scales with it. */
  messages: number;
  elapsedMs: number;
  bps: number;
  idleLatencyMs: number;
  loadedLatencyMs: number;
}

/** Byte size of a binary message. Blobs are released right away: payloads are never kept. */
function binarySize(data: unknown): number {
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    return data.byteLength;
  }
  if (typeof data === 'object' && data !== null && 'size' in data) {
    const blob = data as {size: unknown; close?: unknown};
    // Read before close(): Vega's Blob throws on `size` once released.
    const size = typeof blob.size === 'number' ? blob.size : 0;
    if (typeof blob.close === 'function') {
      blob.close();
    }
    return size;
  }
  return 0;
}

/**
 * Vega registers a blob handler per socket and only removes it in close(),
 * which returns early once the server already closed. Switching back to
 * arraybuffer removes it either way.
 */
function releaseBlobHandler(socket: Ndt7Socket): void {
  if (socket.binaryType !== 'blob') {
    return;
  }
  try {
    socket.binaryType = 'arraybuffer';
  } catch {
    // No blob support means no handler was registered.
  }
}

export function runDownload(
  socket: Ndt7Socket,
  {now, signal, onEvent}: PhaseOptions,
): Promise<DownloadOutcome> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      closeQuietly(socket);
      reject(new SpeedTestError('aborted'));
      return;
    }

    const start = now();
    let bytes = 0;
    let messages = 0;
    const latency = new DownloadLatency();
    let settled = false;

    const ticker = setInterval(sample, SAMPLE_INTERVAL_MS);
    const safety = setTimeout(
      () => settle(new SpeedTestError('timeout')),
      DOWNLOAD_TIMEOUT_MS,
    );
    const onAbort = () => settle(new SpeedTestError('aborted'));
    signal.addEventListener('abort', onAbort);

    socket.onmessage = ({data}) => {
      messages++;
      if (typeof data !== 'string') {
        bytes += binarySize(data);
        return;
      }
      if (isCloseFrameEcho(data)) {
        settle();
        return;
      }
      try {
        latency.add(parseMeasurement(data));
      } catch (error) {
        settle(
          isSpeedTestError(error) ? error : new SpeedTestError('protocol'),
        );
      }
    };
    socket.onclose = ({code}) =>
      code === NORMAL_CLOSE
        ? settle()
        : settle(new SpeedTestError('network_lost'));
    socket.onerror = () => settle(new SpeedTestError('network_lost'));

    function sample() {
      const elapsedMs = now() - start;
      if (elapsedMs > 0) {
        onEvent({
          type: 'throughput',
          direction: 'download',
          bps: bitsPerSecond(bytes, elapsedMs),
          elapsedMs,
        });
      }
      const event = latency.nextEvent();
      if (event) {
        onEvent(event);
      }
    }

    /** No argument: the server finished the test normally. */
    function settle(error?: SpeedTestError) {
      if (settled) {
        return;
      }
      settled = true;
      clearInterval(ticker);
      clearTimeout(safety);
      signal.removeEventListener('abort', onAbort);
      detach(socket);
      releaseBlobHandler(socket);
      if (error) {
        closeQuietly(socket);
        reject(error);
        return;
      }
      const idleMs = latency.idleMs;
      if (idleMs === undefined) {
        reject(new SpeedTestError('protocol'));
        return;
      }
      // The close handshake may still be pending (see isCloseFrameEcho).
      closeQuietly(socket, NORMAL_CLOSE);
      const elapsedMs = now() - start;
      resolve({
        bytes,
        messages,
        elapsedMs,
        bps: bitsPerSecond(bytes, elapsedMs),
        idleLatencyMs: idleMs,
        loadedLatencyMs: latency.loadedMs() ?? idleMs,
      });
    }
  });
}
