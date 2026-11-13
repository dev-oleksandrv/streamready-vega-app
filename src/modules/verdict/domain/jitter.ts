import type {Tone} from './evaluate';

export type JitterLevel = 'steady' | 'uneven' | 'unstable';

/**
 * First level whose bound the jitter stays under; anything above is unstable.
 * Starting values: confirm in device QA.
 */
export const JITTER_LEVELS: readonly {
  level: JitterLevel;
  underMs: number;
  tone: Tone;
}[] = [
  {level: 'steady', underMs: 10, tone: 'good'},
  {level: 'uneven', underMs: 30, tone: 'warn'},
];

/** From the whole ms the screen shows, so a shown "10" is uneven. */
export function jitterLevel(jitterMs: number): {
  level: JitterLevel;
  tone: Tone;
} {
  const shown = Math.round(jitterMs);
  const hit = JITTER_LEVELS.find((l) => shown < l.underMs);
  return hit
    ? {level: hit.level, tone: hit.tone}
    : {level: 'unstable', tone: 'bad'};
}
