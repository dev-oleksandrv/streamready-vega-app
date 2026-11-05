import type {Logger} from '~/shared/lib/logger';

import {expandMacros, type MacroValues} from '../domain/macros';
import {standardMacros} from './standardMacros';

/** A beacon that hangs this long is dropped, so it doesn't hold a socket on the stick. */
export const BEACON_TIMEOUT_MS = 5000;

export interface TrackerDeps {
  fetchFn: typeof fetch;
  now: () => number;
  random?: () => number;
  logger?: Logger;
}

export interface Tracker {
  /**
   * Fire-and-forget GETs to impression, tracking and error URLs. Never throws, never retries.
   * Aborting `signal` cancels the beacons still in flight.
   */
  fire(
    urls: readonly string[],
    macros?: MacroValues,
    signal?: AbortSignal,
  ): void;
}

export function createTracker({
  fetchFn,
  now,
  random = Math.random,
  logger,
}: TrackerDeps): Tracker {
  const send = (url: string, signal: AbortSignal | undefined) => {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);
    const timer = setTimeout(onAbort, BEACON_TIMEOUT_MS);
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    try {
      fetchFn(url, {method: 'GET', signal: controller.signal}).then(
        done,
        () => {
          done();
          // Never the URL or the error text: both may carry the tracker URL.
          logger?.debug('beacon failed');
        },
      );
    } catch {
      done();
      logger?.debug('beacon failed');
    }
  };

  return {
    fire(urls, macros = {}, signal) {
      if (signal?.aborted) {
        return;
      }
      const values = {...standardMacros(now(), random), ...macros};
      const unique = new Set(urls.map((u) => expandMacros(u.trim(), values)));
      for (const url of unique) {
        if (/^https?:\/\/\S+$/i.test(url)) {
          send(url, signal);
        }
      }
    },
  };
}
