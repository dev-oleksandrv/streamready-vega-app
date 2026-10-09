import {SpeedTestError} from '../../domain/errors';

// Protocol: https://github.com/m-lab/ndt-server/blob/main/spec/ndt7-protocol.md
export const NDT7_SUBPROTOCOL = 'net.measurementlab.ndt.v7';
export const LOCATE_URL =
  'https://locate.measurementlab.net/v2/nearest/ndt/ndt7';
export const CLIENT_NAME = 'streamready';
export const DOWNLOAD_URL_KEY = 'wss:///ndt/v7/download';
export const UPLOAD_URL_KEY = 'wss:///ndt/v7/upload';

export const LOCATE_TIMEOUT_MS = 5_000;
export const CONNECT_TIMEOUT_MS = 5_000;
export const MAX_SERVER_ATTEMPTS = 3;
/** The server ends download after ~10s; this only guards a stuck server. */
export const DOWNLOAD_TIMEOUT_MS = 15_000;
export const UPLOAD_DURATION_MS = 10_000;
export const SAMPLE_INTERVAL_MS = 250;

export const MIN_MESSAGE_BYTES = 8 * 1024;
export const MAX_MESSAGE_BYTES = 1024 * 1024;
export const SCALING_FACTOR = 16;
/**
 * Vega's WebSocket never updates bufferedAmount, so upload pacing counts
 * bytes sent minus the server's BytesReceived instead.
 */
export const MAX_IN_FLIGHT_BYTES = 8 * 1024 * 1024;
export const MESSAGES_PER_TICK = 4;
export const CAPPED_RETRY_MS = 10;
export const NORMAL_CLOSE = 1000;

export interface TcpSample {
  minRttMs?: number;
  rttMs?: number;
  bytesReceived?: number;
  elapsedMs?: number;
}

function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function microsToMs(value: unknown): number | undefined {
  const micros = count(value);
  return micros === undefined ? undefined : micros / 1000;
}

function positiveMicrosToMs(value: unknown): number | undefined {
  const ms = microsToMs(value);
  // A zero RTT means the kernel has no sample yet, not a zero-latency link.
  return ms === undefined || ms === 0 ? undefined : ms;
}

/** Parses a server Measurement text message. Messages without TCPInfo yield `{}`. */
export function parseMeasurement(text: string): TcpSample {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SpeedTestError('protocol');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new SpeedTestError('protocol');
  }
  const tcp = (parsed as {TCPInfo?: unknown}).TCPInfo;
  if (typeof tcp !== 'object' || tcp === null) {
    return {};
  }
  const info = tcp as Record<string, unknown>;
  return {
    minRttMs: positiveMicrosToMs(info.MinRTT),
    rttMs: positiveMicrosToMs(info.RTT),
    bytesReceived: count(info.BytesReceived),
    elapsedMs: microsToMs(info.ElapsedTime),
  };
}
