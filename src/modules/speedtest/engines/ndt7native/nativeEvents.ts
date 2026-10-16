import {SpeedTestError, type SpeedTestErrorCode} from '../../domain/errors';

export const NATIVE_EVENT = 'ndt7native';

/** Codes native code can report; Locate failures only happen in TypeScript. */
export type NativeErrorCode = Extract<
  SpeedTestErrorCode,
  'connect_failed' | 'network_lost' | 'timeout' | 'protocol' | 'aborted'
>;

const NATIVE_ERROR_CODES: readonly string[] = [
  'connect_failed',
  'network_lost',
  'timeout',
  'protocol',
  'aborted',
] satisfies readonly NativeErrorCode[];

export interface NativeRunEvent {
  runId: number;
  /** Strictly increasing per run: emit() does not keep order across calls. */
  seq: number;
  type: 'progress' | 'done';
  /** Download: payload bytes received. Upload: payload bytes sent. */
  bytes: number;
  /** Since the WebSocket handshake completed. */
  elapsedMs: number;
  /** Server measurement texts since the previous event, unparsed. */
  measurements: string[];
  error?: NativeErrorCode;
  /** The TV's own TCP RTT (download only, Linux only). */
  client?: {minRttMs: number; rttMs: number};
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Above this a kernel RTT is a placeholder (e.g. ~0U before a sample), not a path. */
const MAX_PLAUSIBLE_RTT_US = 60_000_000;

const isPlausibleRtt = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value > 0 &&
  value <= MAX_PLAUSIBLE_RTT_US;

const isNativeErrorCode = (value: unknown): value is NativeErrorCode =>
  typeof value === 'string' && NATIVE_ERROR_CODES.includes(value);

export function parseNativeEvent(payload: unknown): NativeRunEvent {
  if (!isRecord(payload)) {
    throw new SpeedTestError('protocol');
  }
  const {
    runId,
    seq,
    type,
    bytes,
    elapsedMs,
    measurements,
    error,
    clientMinRttUs,
    clientRttUs,
  } = payload;
  if (
    !isCount(runId) ||
    !isCount(seq) ||
    (type !== 'progress' && type !== 'done') ||
    !isCount(bytes) ||
    !isCount(elapsedMs) ||
    !Array.isArray(measurements) ||
    !measurements.every((m): m is string => typeof m === 'string')
  ) {
    throw new SpeedTestError('protocol');
  }
  if (error !== undefined && (type !== 'done' || !isNativeErrorCode(error))) {
    throw new SpeedTestError('protocol');
  }
  const event: NativeRunEvent = {
    runId,
    seq,
    type,
    bytes,
    elapsedMs,
    measurements,
  };
  if (error !== undefined) {
    event.error = error;
  }
  // Client RTT is advisory: a bad value drops the sample, never the run.
  if (isPlausibleRtt(clientMinRttUs) && isPlausibleRtt(clientRttUs)) {
    event.client = {minRttMs: clientMinRttUs / 1000, rttMs: clientRttUs / 1000};
  }
  return event;
}
