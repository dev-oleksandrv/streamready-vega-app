import {toneColor} from '~/modules/speedtest/ui/toneColor';
import {colors} from '~/shared/ui';

test.each([
  ['good', colors.lime],
  ['warn', colors.amber],
  ['bad', colors.coral],
] as const)('%s → %s', (tone, color) => {
  expect(toneColor(tone)).toBe(color);
});
