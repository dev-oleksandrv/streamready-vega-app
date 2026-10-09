import {isSpeedTestError, SpeedTestError} from '../../domain/errors';
import type {PhaseOptions} from './download';
import {
  CAPPED_RETRY_MS,
  MAX_BYTES_PER_TICK,
  MAX_IN_FLIGHT_BYTES,
  MAX_MESSAGE_BYTES,
  MIN_MESSAGE_BYTES,
  NORMAL_CLOSE,
  parseMeasurement,
  SCALING_FACTOR,
  UPLOAD_DURATION_MS,
} from './protocol';
import {closeQuietly, detach, type Ndt7Socket} from './socket';

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
  {now, signal, onEvent}: PhaseOptions,
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
    let size = MIN_MESSAGE_BYTES;
    let bytesSent = 0;
    let serverBytes = 0;
    let lastBps: number | undefined;
    let settled = false;
    let pumpTimer: ReturnType<typeof setTimeout> | undefined;

    const stopTimer = setTimeout(complete, UPLOAD_DURATION_MS);
    const onAbort = () => settle(new SpeedTestError('aborted'));
    signal.addEventListener('abort', onAbort);

    socket.onmessage = ({data}) => {
      if (typeof data !== 'string') {
        return;
      }
      try {
        const m = parseMeasurement(data);
        if (
          m.bytesReceived !== undefined &&
          m.elapsedMs !== undefined &&
          m.elapsedMs > 0
        ) {
          serverBytes = m.bytesReceived;
          lastBps = (m.bytesReceived * 8000) / m.elapsedMs;
          onEvent({
            type: 'throughput',
            direction: 'upload',
            bps: lastBps,
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

    function canSend(): boolean {
      const buffered = socket.bufferedAmount;
      return (
        bytesSent - serverBytes < MAX_IN_FLIGHT_BYTES &&
        (typeof buffered !== 'number' || buffered < MAX_IN_FLIGHT_BYTES)
      );
    }

    function pump() {
      pumpTimer = undefined;
      if (settled) {
        return;
      }
      for (let tickBytes = 0; tickBytes < MAX_BYTES_PER_TICK; ) {
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
        tickBytes += size;
        if (size < MAX_MESSAGE_BYTES && bytesSent >= SCALING_FACTOR * size) {
          size *= 2;
        }
      }
      // Yield so incoming measurements and UI work get the JS thread.
      pumpTimer = setTimeout(pump, 0);
    }

    function complete() {
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
