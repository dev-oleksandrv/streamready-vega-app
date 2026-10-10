import {HttpError} from '~/shared/lib/http';
import {createLogger} from '~/shared/lib/logger';

import type {ConnectionInfo, GeoIpProvider} from '../domain/connection';

export interface FallbackChainOptions {
  /** One deadline for the whole chain, so Accept and the splash never wait longer. */
  timeoutMs: number;
}

const log = createLogger('insights');

export function fallbackChain(
  providers: readonly GeoIpProvider[],
  {timeoutMs}: FallbackChainOptions,
): GeoIpProvider {
  return {
    id: providers.map((p) => p.id).join('>'),
    async lookup(signal) {
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const onCallerAbort = () => controller.abort();
      signal.addEventListener('abort', onCallerAbort);
      if (signal.aborted) {
        controller.abort();
      }
      const stoppedError = () =>
        new HttpError(timedOut ? 'timeout' : 'aborted');
      // Raced against every lookup: a provider that ignores its signal can't outlive the deadline.
      const stopped = new Promise<never>((_resolve, reject) => {
        const fail = () => reject(stoppedError());
        if (controller.signal.aborted) {
          fail();
        } else {
          controller.signal.addEventListener('abort', fail);
        }
      });
      stopped.catch(() => {});

      let lastError: unknown = stoppedError();
      try {
        for (const provider of providers) {
          if (controller.signal.aborted) {
            break;
          }
          try {
            return await Promise.race<ConnectionInfo>([
              provider.lookup(controller.signal),
              stopped,
            ]);
          } catch (error) {
            lastError = error;
            // HttpError messages carry the kind only, never the response or the IP.
            log.warn(`${provider.id} failed`, error);
          }
        }
        throw controller.signal.aborted ? stoppedError() : lastError;
      } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', onCallerAbort);
      }
    },
  };
}
