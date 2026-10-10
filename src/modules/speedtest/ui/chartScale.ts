/** Headroom above the tallest bar, as in the design. */
const HEADROOM = 1.15;
/** The chart never scales below 1 Mbps, so a near-zero start doesn't fill it. */
const MIN_TOP_BPS = 1e6;
/** Keeps a zero sample visible as a sliver, as in the design. */
const MIN_FRACTION = 0.02;
/** Chart tops per decade: coarse enough that rescales (animated) stay rare. */
const STEPS = [1, 1.5, 2, 3, 5, 7.5];

/** Top of the chart in bits/s: the next step above the peak plus headroom. */
export function chartTopBps(peakBps: number): number {
  const target = Math.max(peakBps * HEADROOM, MIN_TOP_BPS);
  const decade = 10 ** Math.floor(Math.log10(target));
  const step = STEPS.find((s) => s * decade >= target);
  return (step ?? 10) * decade;
}

export function barFraction(bps: number, topBps: number): number {
  return Math.min(1, Math.max(MIN_FRACTION, bps / topBps));
}
