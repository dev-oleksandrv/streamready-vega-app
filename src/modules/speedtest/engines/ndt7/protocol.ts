import {SpeedTestError} from '../../domain/errors';

// Protocol: https://github.com/m-lab/ndt-server/blob/main/spec/ndt7-protocol.md
export const NDT7_SUBPROTOCOL = 'net.measurementlab.ndt.v7';
export const LOCATE_URL =
  'https://locate.measurementlab.net/v2/nearest/ndt/ndt7';
export const CLIENT_NAME = 'streamready';
export const DOWNLOAD_URL_KEY = 'wss:///ndt/v7/download';
export const UPLOAD_URL_KEY = 'wss:///ndt/v7/upload';
/** Plain ws:// URLs: the native engine has no TLS (ADR 0006). */
export const PLAIN_DOWNLOAD_URL_KEY = 'ws:///ndt/v7/download';
export const PLAIN_UPLOAD_URL_KEY = 'ws:///ndt/v7/upload';

export const LOCATE_TIMEOUT_MS = 5_000;
export const CONNECT_TIMEOUT_MS = 5_000;
export const MAX_SERVER_ATTEMPTS = 3;
/** The server ends download after ~10s; this only guards a stuck server. */
export const DOWNLOAD_TIMEOUT_MS = 15_000;
export const UPLOAD_DURATION_MS = 10_000;
export const SAMPLE_INTERVAL_MS = 250;

export const MIN_MESSAGE_BYTES = 8 * 1024;
/**
 * Upload stops scaling at 16 KiB. Vega's WebSocket sends through libcurl 8.4
 * (experimental WebSocket support); larger sends failed with "Failed sending
 * data to the peer" or crashed (SIGSEGV in libcurl) on the stick.
 */
export const MAX_MESSAGE_BYTES = 16 * 1024;
export const SCALING_FACTOR = 16;
/**
 * Upload windows the engine can use, smallest first. Vega fails a socket that
 * backs up instead of buffering (the VVD failed at ~192 KiB), so a failed
 * upload retries with the next smaller window.
 */
export const UPLOAD_WINDOW_OPTIONS = [
  32 * 1024,
  64 * 1024,
  128 * 1024,
  256 * 1024,
  512 * 1024,
  1024 * 1024,
] as const;
/** The only window that completed on the stick; larger ones are for experiments. */
export const DEFAULT_UPLOAD_WINDOW_BYTES = 32 * 1024;
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

/**
 * Vega's WebSocket hands a close frame's payload to onmessage as text, then
 * fires onclose seconds later with a code that isn't the frame's (seen: 1).
 * The echo is the reliable "server ended the test" signal. The 2-byte status
 * code (1000-4999) starts with a control character, and its second byte is
 * usually dropped as invalid UTF-8.
 */
export function isCloseFrameEcho(text: string): boolean {
  return text.length > 0 && text.length <= 2 && text.charCodeAt(0) < 0x20;
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
