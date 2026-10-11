import {roundMbps} from '~/shared/lib/format';

import {lagGrade} from './grade';
import {
  GRADE_TONE,
  HD_MBPS,
  LAGGY_GRADES,
  NEAR_LIMIT_RATIO,
  STREAM_CHECKS,
  TIER_MIN_MBPS,
  TIER_TONE,
  TWO_UHD_MBPS,
} from './thresholds';

export type LagGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type Tier = 'good' | 'limited' | 'poor';
/** Semantic; the UI maps it to lime / amber / coral. */
export type Tone = 'good' | 'warn' | 'bad';
export type Outcome =
  | 'twoUhd'
  | 'oneUhd'
  | 'laggy'
  | 'limited'
  | 'hdOnly'
  | 'buffering';
export type StreamCheckId = 'hd' | 'fhd' | 'uhd' | 'uhd2x';

export interface StreamCheckResult {
  id: StreamCheckId;
  minMbps: number;
  passed: boolean;
}

export interface VerdictInput {
  downloadBps: number;
  idleLatencyMs: number;
  loadedLatencyMs: number;
  /** From the device profile; undefined = unknown device. */
  deviceLimitMbps?: number;
  onWifi: boolean;
}

export interface Verdict {
  outcome: Outcome;
  tier: Tier;
  tone: Tone;
  checks: readonly StreamCheckResult[];
  grade: LagGrade;
  gradeTone: Tone;
  bloatMs: number;
  nearDeviceLimit: boolean;
}

/** The download the user sees, so a shown "25.0" never fails the 25 Mbps check. */
function shownMbps(bps: number): number {
  return Number.isFinite(bps) && bps > 0 ? roundMbps(bps) : 0;
}

/** From whole-ms values, as shown; noisy RTT can put loaded under idle. */
function bloat(idleMs: number, loadedMs: number): number {
  const raw = Math.round(loadedMs) - Math.round(idleMs);
  return Number.isFinite(raw) ? Math.max(0, raw) : 0;
}

function speedTier(dl: number): Tier {
  if (dl >= TIER_MIN_MBPS.good) {
    return 'good';
  }
  return dl >= TIER_MIN_MBPS.limited ? 'limited' : 'poor';
}

function outcomeFor(tier: Tier, laggy: boolean, dl: number): Outcome {
  if (laggy) {
    return 'laggy';
  }
  switch (tier) {
    case 'good':
      return dl >= TWO_UHD_MBPS ? 'twoUhd' : 'oneUhd';
    case 'limited':
      return 'limited';
    case 'poor':
      return dl >= HD_MBPS ? 'hdOnly' : 'buffering';
  }
}

export function evaluate(input: VerdictInput): Verdict {
  const dl = shownMbps(input.downloadBps);
  const bloatMs = bloat(input.idleLatencyMs, input.loadedLatencyMs);
  const grade = lagGrade(bloatMs);
  const bySpeed = speedTier(dl);
  // Fast enough for 4K, but delay under load would still stall it.
  const laggy = bySpeed === 'good' && LAGGY_GRADES.includes(grade);
  const tier: Tier = laggy ? 'limited' : bySpeed;

  return {
    outcome: outcomeFor(tier, laggy, dl),
    tier,
    tone: TIER_TONE[tier],
    checks: STREAM_CHECKS.map((c) => ({...c, passed: dl >= c.minMbps})),
    grade,
    gradeTone: GRADE_TONE[grade],
    bloatMs,
    nearDeviceLimit:
      input.deviceLimitMbps !== undefined &&
      input.onWifi &&
      dl >= NEAR_LIMIT_RATIO * input.deviceLimitMbps,
  };
}
