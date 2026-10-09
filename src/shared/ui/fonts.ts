export type FontWeight = 'regular' | 'medium' | 'semibold';

// Vega loads fonts from <app root>/assets/fonts; the family name is the file name.
export const fontFamilies = {
  regular: 'Geist-Regular',
  medium: 'Geist-Medium',
  semibold: 'Geist-SemiBold',
  monoRegular: 'GeistMono-Regular',
  monoMedium: 'GeistMono-Medium',
} as const;

export function fontFamilyFor(weight: FontWeight, mono = false): string {
  if (mono) {
    // Only two mono weights are bundled; semibold falls back to medium.
    return weight === 'regular'
      ? fontFamilies.monoRegular
      : fontFamilies.monoMedium;
  }
  return fontFamilies[weight];
}
