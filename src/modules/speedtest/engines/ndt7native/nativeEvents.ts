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
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isNativeErrorCode = (value: unknown): value is NativeErrorCode =>
  typeof value === 'string' && NATIVE_ERROR_CODES.includes(value);

export function parseNativeEvent(payload: unknown): NativeRunEvent {
  if (!isRecord(payload)) {
    throw new SpeedTestError('protocol');
  }
  const {runId, seq, type, bytes, elapsedMs, measurements, error} = payload;
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
  return event;
}
