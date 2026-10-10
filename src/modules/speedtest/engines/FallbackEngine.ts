import {createLogger, type Logger} from '~/shared/lib/logger';

import type {
  RunOptions,
  SpeedTestEngine,
  SpeedTestResult,
} from '../domain/engine';
import {isSpeedTestError, type SpeedTestErrorCode} from '../domain/errors';

/**
 * Failures that mean "the primary engine cannot run here" (module missing,
 * ws:// blocked, no plain URLs), as opposed to a real network problem.
 */
const FALLBACK_CODES: ReadonlySet<SpeedTestErrorCode> = new Set([
  'connect_failed',
  'no_servers',
]);

/**
 * Runs `primary`; runs `fallback` from scratch only when primary failed before
 * reaching a server or moving download data, with a FALLBACK_CODES error (ADR 0006). Later failures are
 * reported as-is so a flaky link never triggers a second M-Lab test.
 */
export class FallbackEngine implements SpeedTestEngine {
  readonly id: string;
  private readonly log: Logger;

  constructor(
    private readonly primary: SpeedTestEngine,
    private readonly fallback: SpeedTestEngine,
    logger?: Logger,
  ) {
    this.id = primary.id;
    this.log = logger ?? createLogger('speedtest:fallback');
  }

  async run({signal, onEvent}: RunOptions): Promise<SpeedTestResult> {
    // A reached server or any download data proves the primary path works here.
    let primaryWorked = false;
    try {
      return await this.primary.run({
        signal,
        onEvent: (event) => {
          if (
            event.type === 'server' ||
            (event.type === 'throughput' && event.direction === 'download')
          ) {
            primaryWorked = true;
          }
          onEvent(event);
        },
      });
    } catch (error) {
      if (
        signal.aborted ||
        primaryWorked ||
        !isSpeedTestError(error) ||
        !FALLBACK_CODES.has(error.code)
      ) {
        throw error;
      }
      this.log.warn('fallback', {
        from: this.primary.id,
        to: this.fallback.id,
        code: error.code,
      });
      return this.fallback.run({signal, onEvent});
    }
  }
}
