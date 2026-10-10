import {SpeedTestError} from '../../domain/errors';

// Protocol: https://github.com/m-lab/ndt-server/blob/main/spec/ndt7-protocol.md
export const LOCATE_URL =
  'https://locate.measurementlab.net/v2/nearest/ndt/ndt7';
export const CLIENT_NAME = 'streamready';
/** Plain ws:// URLs: the native engine has no TLS (ADR 0006). */
export const DOWNLOAD_URL_KEY = 'ws:///ndt/v7/download';
export const UPLOAD_URL_KEY = 'ws:///ndt/v7/upload';

export const LOCATE_TIMEOUT_MS = 5_000;
export const MAX_SERVER_ATTEMPTS = 3;

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
