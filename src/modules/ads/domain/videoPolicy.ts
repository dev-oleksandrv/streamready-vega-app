import type {Tier} from '~/modules/verdict';

/** At most one video ad per 30 minutes, counted from when the last one started. */
export const VIDEO_INTERVAL_MS = 30 * 60_000;

/** Skip turns on after 5 s. */
export const SKIP_AFTER_MS = 5_000;

/** Longer videos are refused, and playback stops at 30 s regardless. */
export const MAX_VIDEO_MS = 30_000;

export interface VideoPolicyInput {
  now: number;
  /** When the last video ad started, epoch ms. */
  lastVideoAt: number | undefined;
  tier: Tier;
}

/** Only after a result good enough to stream, and not within 30 minutes of the last video. */
export function canShowVideo({
  now,
  lastVideoAt,
  tier,
}: VideoPolicyInput): boolean {
  if (tier !== 'good') {
    return false;
  }
  if (lastVideoAt === undefined) {
    return true;
  }
  // A last video "in the future" means the clock moved back: treat it as just shown.
  return lastVideoAt <= now && now - lastVideoAt >= VIDEO_INTERVAL_MS;
}
