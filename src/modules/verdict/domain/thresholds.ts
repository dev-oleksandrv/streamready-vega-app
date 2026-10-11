import type {LagGrade, StreamCheckId, Tier, Tone} from './evaluate';

export const STREAM_CHECKS: readonly {id: StreamCheckId; minMbps: number}[] = [
  {id: 'hd', minMbps: 3},
  {id: 'fhd', minMbps: 5},
  {id: 'uhd', minMbps: 25},
  {id: 'uhd2x', minMbps: 50},
];

/** First grade whose bound the bloat stays under; anything above is F. */
export const LAG_GRADES: readonly {grade: LagGrade; underMs: number}[] = [
  {grade: 'A', underMs: 30},
  {grade: 'B', underMs: 60},
  {grade: 'C', underMs: 200},
  {grade: 'D', underMs: 400},
];

export const LAG_GRADE_ORDER: readonly LagGrade[] = ['A', 'B', 'C', 'D', 'F'];

export const TIER_MIN_MBPS = {good: 25, limited: 5} as const;

/** Two 4K streams at once: splits the good tier's copy. */
export const TWO_UHD_MBPS = 50;

/** HD 720p: splits the poor tier's copy. */
export const HD_MBPS = 3;

/** Share of the device's Wi‑Fi ceiling that counts as near the limit. */
export const NEAR_LIMIT_RATIO = 0.6;

/** Grades that drop a fast connection to limited. */
export const LAGGY_GRADES: readonly LagGrade[] = ['D', 'F'];

export const TIER_TONE: Readonly<Record<Tier, Tone>> = {
  good: 'good',
  limited: 'warn',
  poor: 'bad',
};

export const GRADE_TONE: Readonly<Record<LagGrade, Tone>> = {
  A: 'good',
  B: 'good',
  C: 'warn',
  D: 'bad',
  F: 'bad',
};
