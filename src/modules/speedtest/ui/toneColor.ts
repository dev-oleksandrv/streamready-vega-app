import type {Tone} from '~/modules/verdict';
import {colors} from '~/shared/ui';

const TONE_COLORS: Readonly<Record<Tone, string>> = {
  good: colors.lime,
  warn: colors.amber,
  bad: colors.coral,
};

export function toneColor(tone: Tone): string {
  return TONE_COLORS[tone];
}
