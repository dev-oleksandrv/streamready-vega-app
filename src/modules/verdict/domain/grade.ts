import type {LagGrade} from './evaluate';
import {LAG_GRADES} from './thresholds';

/** Grade of the delay added under load (loaded − idle latency). */
export function lagGrade(bloatMs: number): LagGrade {
  return LAG_GRADES.find((g) => bloatMs < g.underMs)?.grade ?? 'F';
}
