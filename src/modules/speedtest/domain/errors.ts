export type SpeedTestErrorCode =
  | 'locate_failed'
  | 'no_servers'
  | 'connect_failed'
  | 'network_lost'
  | 'timeout'
  | 'protocol'
  | 'aborted';

export class SpeedTestError extends Error {
  readonly code: SpeedTestErrorCode;

  constructor(code: SpeedTestErrorCode) {
    // The message never includes a URL: server URLs carry access tokens.
    super(`speedtest ${code}`);
    this.name = 'SpeedTestError';
    this.code = code;
  }
}

export function isSpeedTestError(value: unknown): value is SpeedTestError {
  return value instanceof SpeedTestError;
}
