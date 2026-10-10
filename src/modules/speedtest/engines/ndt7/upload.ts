import {isSpeedTestError, SpeedTestError} from '../../domain/errors';
import type {PhaseOptions} from './download';
import {
  CAPPED_RETRY_MS,
  isCloseFrameEcho,
  MAX_MESSAGE_BYTES,
  MIN_MESSAGE_BYTES,
  NORMAL_CLOSE,
  parseMeasurement,
  SCALING_FACTOR,
  UPLOAD_DURATION_MS,
} from './protocol';
import {UploadRate} from './measurements';
import {closeQuietly, detach, type Ndt7Socket} from './socket';

export interface UploadOptions extends PhaseOptions {
  /** Most bytes allowed on the way to the server without its confirmation. */
  windowBytes: number;
}

export interface UploadOutcome {
  bps: number;
  elapsedMs: number;
}

const NOISE_BLOCK_BYTES = 4096;

/**
 * Random bytes so nothing on the path can compress them. One small random
 * block is tiled across the buffer: filling 1 MiB byte-by-byte would stall
 * the JS thread mid-upload.
 */
function noiseBuffer(size: number): ArrayBuffer {
  const block = new Uint8Array(NOISE_BLOCK_BYTES);
  for (let i = 0; i < block.length; i++) {
    block[i] = Math.floor(Math.random() * 256);
  }
  const bytes = new Uint8Array(size);
  for (let offset = 0; offset < size; offset += block.length) {
    bytes.set(block.subarray(0, Math.min(block.length, size - offset)), offset);
  }
  return bytes.buffer;
}

export function runUpload(
  socket: Ndt7Socket,
  {now, signal, onEvent, windowBytes}: UploadOptions,
): Promise<UploadOutcome> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      closeQuietly(socket);
      reject(new SpeedTestError('aborted'));
      return;
    }

    const start = now();
    // One reusable buffer per message size: at most ~2 MiB in total.
    const buffers = new Map<number, ArrayBuffer>();
    // A single message is a burst too, so it never exceeds half the window.
    const maxSize = Math.max(
      MIN_MESSAGE_BYTES,
      Math.min(MAX_MESSAGE_BYTES, windowBytes / 2),
    );
    let size = MIN_MESSAGE_BYTES;
    let bytesSent = 0;
    const rate = new UploadRate();
    let measuredAt = start;
    let settled = false;
    let pumpTimer: ReturnType<typeof setTimeout> | undefined;

    const stopTimer = setTimeout(complete, UPLOAD_DURATION_MS);
    const onAbort = () => settle(new SpeedTestError('aborted'));
    signal.addEventListener('abort', onAbort);

    socket.onmessage = ({data}) => {
      if (typeof data !== 'string') {
        return;
      }
      if (isCloseFrameEcho(data)) {
        complete();
        return;
      }
      try {
        const bps = rate.add(parseMeasurement(data));
        if (bps !== undefined) {
          measuredAt = now();
          onEvent({
            type: 'throughput',
            direction: 'upload',
            bps,
            elapsedMs: now() - start,
          });
        }
      } catch (error) {
        settle(
          isSpeedTestError(error) ? error : new SpeedTestError('protocol'),
        );
      }
    };
    socket.onclose = ({code}) =>
      code === NORMAL_CLOSE
        ? complete()
        : settle(new SpeedTestError('network_lost'));
    socket.onerror = () => settle(new SpeedTestError('network_lost'));

    pump();

    function bufferFor(bytes: number): ArrayBuffer {
      let buffer = buffers.get(bytes);
      if (!buffer) {
        buffer = noiseBuffer(bytes);
        buffers.set(bytes, buffer);
      }
      return buffer;
    }

    /**
     * Vega's WebSocket neither buffers nor reports bufferedAmount: it fails
     * with "Failed sending data to the peer" once the socket backs up. The
     * only progress signal is the server's measurement (~every 250 ms,
     * Poisson, up to 625 ms), so between reports the server is assumed to
     * keep draining at its last measured rate.
     */
    function unconfirmedBytes(): number {
      const lastBps = rate.lastBps;
      const drainedSince =
        lastBps === undefined ? 0 : ((now() - measuredAt) * lastBps) / 8000;
      return Math.max(0, bytesSent - (rate.serverBytes + drainedSince));
    }

    function canSend(): boolean {
      const buffered = socket.bufferedAmount;
      return (
        unconfirmedBytes() + size <= windowBytes &&
        (typeof buffered !== 'number' || buffered + size <= windowBytes)
      );
    }

    function pump() {
      pumpTimer = undefined;
      if (settled) {
        return;
      }
      if (!canSend()) {
        pumpTimer = setTimeout(pump, CAPPED_RETRY_MS);
        return;
      }
      try {
        socket.send(bufferFor(size));
      } catch {
        settle(new SpeedTestError('network_lost'));
        return;
      }
      bytesSent += size;
      if (size < maxSize && bytesSent >= SCALING_FACTOR * size) {
        size = Math.min(size * 2, maxSize);
      }
      // One send per tick, as ndt7-js does since bursts overflowed Safari's
      // socket; it also leaves the JS thread to measurements and the UI.
      pumpTimer = setTimeout(pump, 0);
    }

    function complete() {
      const lastBps = rate.lastBps;
      settle(lastBps === undefined ? new SpeedTestError('protocol') : lastBps);
    }

    function settle(outcome: SpeedTestError | number) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(stopTimer);
      if (pumpTimer !== undefined) {
        clearTimeout(pumpTimer);
      }
      signal.removeEventListener('abort', onAbort);
      detach(socket);
      if (typeof outcome === 'number') {
        closeQuietly(socket, NORMAL_CLOSE);
        resolve({bps: outcome, elapsedMs: now() - start});
      } else {
        closeQuietly(socket);
        reject(outcome);
      }
    }
  });
}
