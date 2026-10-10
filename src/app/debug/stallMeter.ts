// Temporary: measures how late a fixed-interval timer fires, which is how long
// the JS thread was too busy to run it (and to render).
export const STALL_PROBE_INTERVAL_MS = 100;

export interface StallStats {
  maxMs: number;
  totalMs: number;
  samples: number;
}

export const emptyStall: StallStats = {maxMs: 0, totalMs: 0, samples: 0};

export function recordStall(stats: StallStats, lateMs: number): StallStats {
  const late = Math.max(0, lateMs);
  return {
    maxMs: Math.max(stats.maxMs, late),
    totalMs: stats.totalMs + late,
    samples: stats.samples + 1,
  };
}

/** Whole-millisecond max and average, or undefined before the first sample. */
export function summarizeStall(
  stats: StallStats,
): {maxMs: number; avgMs: number} | undefined {
  if (stats.samples === 0) {
    return undefined;
  }
  return {
    maxMs: Math.round(stats.maxMs),
    avgMs: Math.round(stats.totalMs / stats.samples),
  };
}
