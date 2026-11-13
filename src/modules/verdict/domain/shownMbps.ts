import {roundMbps} from '~/shared/lib/format';

/** The download the user sees, so a shown "25.0" never fails the 25 Mbps check. */
export function shownMbps(bps: number): number {
  return Number.isFinite(bps) && bps > 0 ? roundMbps(bps) : 0;
}
