import {SERVICES} from './services';
import type {ServiceId, ServiceTier} from './services';
import {shownMbps} from './shownMbps';

export interface ServiceVerdict {
  id: ServiceId;
  /** Highest tier the download reaches; undefined below the lowest. */
  best?: ServiceTier;
  /** The tier above `best`; undefined at the top tier. */
  next?: ServiceTier;
}

/** Download only: lag never changes what a service needs. */
export function serviceVerdicts(
  downloadBps: number,
): readonly ServiceVerdict[] {
  const dl = shownMbps(downloadBps);
  return SERVICES.map(({id, tiers}) => {
    let passed = -1;
    tiers.forEach((t, i) => {
      if (t.minMbps <= dl) {
        passed = i;
      }
    });
    const verdict: ServiceVerdict = {id};
    if (passed >= 0) {
      verdict.best = tiers[passed];
    }
    const next = tiers[passed + 1];
    if (next) {
      verdict.next = next;
    }
    return verdict;
  });
}
