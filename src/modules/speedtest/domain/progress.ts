import type {TestPhase} from './engine';

/** ndt7 subtests run ~10 s each; progress past that just stays full. */
export const NOMINAL_SUBTEST_MS = 10_000;

/** Fill of the Ping / Download / Upload step bars, 0..1 each. */
export interface StepProgress {
  ping: number;
  download: number;
  upload: number;
}

export const NO_PROGRESS: StepProgress = {ping: 0, download: 0, upload: 0};
export const FULL_PROGRESS: StepProgress = {ping: 1, download: 1, upload: 1};

/** Locate and the socket open have no measurable length, so Ping fills in two jumps. */
export function progressForPhase(
  prev: StepProgress,
  phase: TestPhase,
): StepProgress {
  switch (phase) {
    case 'locating':
      return {...prev, ping: 0};
    case 'latency':
      return {...prev, ping: 0.5};
    case 'download':
      return {...prev, ping: 1};
    case 'upload':
      return {...prev, ping: 1, download: 1};
  }
}

export function subtestFraction(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return 0;
  }
  return Math.min(1, elapsedMs / NOMINAL_SUBTEST_MS);
}
