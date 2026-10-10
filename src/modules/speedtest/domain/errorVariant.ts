import type {SpeedTestErrorCode} from './errors';

/** What the error overlay shows; codes never reach the UI. */
export type TestErrorVariant =
  | 'connectionLost'
  | 'serversUnavailable'
  | 'interrupted';

const VARIANTS: Record<SpeedTestErrorCode, TestErrorVariant | undefined> = {
  network_lost: 'connectionLost',
  locate_failed: 'serversUnavailable',
  no_servers: 'serversUnavailable',
  connect_failed: 'interrupted',
  timeout: 'interrupted',
  protocol: 'interrupted',
  // The user stopped the test: nothing to show.
  aborted: undefined,
};

export function errorVariant(
  code: SpeedTestErrorCode,
): TestErrorVariant | undefined {
  return VARIANTS[code];
}
