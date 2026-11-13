import type {StreamCheckId} from './evaluate';
import {STREAM_CHECKS} from './thresholds';

export type ServiceId =
  | 'netflix'
  | 'primeVideo'
  | 'youtube'
  | 'disneyPlus'
  | 'appleTv'
  | 'hboMax';
export type ServiceTierId = Exclude<StreamCheckId, 'uhd2x'>;
/** `official`: the service's own published minimum. `typical`: the generic value. */
export type FigureSource = 'official' | 'typical';

export interface ServiceTier {
  tier: ServiceTierId;
  minMbps: number;
  source: FigureSource;
}

export interface Service {
  id: ServiceId;
  /** Ascending: HD, Full HD, 4K. */
  tiers: readonly ServiceTier[];
}

/** Generic minimum from `STREAM_CHECKS`, so thresholds are never duplicated. */
function typical(tier: ServiceTierId): ServiceTier {
  const check = STREAM_CHECKS.find((c) => c.id === tier);
  if (!check) {
    throw new Error(`No stream check for ${tier}`);
  }
  return {tier, minMbps: check.minMbps, source: 'typical'};
}

function official(tier: ServiceTierId, minMbps: number): ServiceTier {
  return {tier, minMbps, source: 'official'};
}

/**
 * Bundled, never fetched. An `official` figure needs a source comment with the
 * URL and the date checked; update table, comment and tests together.
 */
export const SERVICES: readonly Service[] = [
  {
    // https://help.netflix.com/en/node/306, checked 2026-11-13
    id: 'netflix',
    tiers: [official('hd', 3), official('fhd', 5), official('uhd', 15)],
  },
  {
    // No official figure confirmed (page unreachable 2026-11-13)
    id: 'primeVideo',
    tiers: [typical('hd'), typical('fhd'), typical('uhd')],
  },
  {
    // https://support.google.com/youtube/answer/78358, checked 2026-11-13
    id: 'youtube',
    tiers: [official('hd', 2.5), official('fhd', 5), official('uhd', 20)],
  },
  {
    // Help Center figures not confirmed on 2026-11-13
    id: 'disneyPlus',
    tiers: [typical('hd'), typical('fhd'), typical('uhd')],
  },
  {
    // 4K: https://support.apple.com/en-us/HT207949, checked 2026-11-13
    id: 'appleTv',
    tiers: [typical('hd'), typical('fhd'), official('uhd', 25)],
  },
  {
    // HD: https://help.hbomax.com/us/Answer/Detail/000002519
    // 4K minimum (not the 50 recommended): https://help.hbomax.com/us/Answer/Detail/000002523
    // Both checked 2026-11-13
    id: 'hboMax',
    tiers: [typical('hd'), official('fhd', 5), official('uhd', 25)],
  },
];
