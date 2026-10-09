import {colors, resolveFocusLook} from '~/shared/ui';

describe('resolveFocusLook', () => {
  test.each([
    [
      'primary',
      false,
      false,
      'transparent',
      colors.surfaceRaised,
      colors.text,
      1,
    ],
    ['primary', true, false, colors.lime, colors.lime, colors.onLime, 1.05],
    ['secondary', false, false, 'transparent', colors.surface, colors.text, 1],
    [
      'secondary',
      true,
      false,
      colors.lime,
      colors.surfaceFocused,
      colors.text,
      1.05,
    ],
    [
      'primary',
      false,
      true,
      'transparent',
      colors.surface,
      colors.textMuted,
      1,
    ],
    [
      'primary',
      true,
      true,
      colors.focusDisabled,
      colors.surface,
      colors.textMuted,
      1.03,
    ],
    [
      'secondary',
      true,
      true,
      colors.focusDisabled,
      colors.surface,
      colors.textMuted,
      1.03,
    ],
  ] as const)(
    '%s focused=%p disabled=%p',
    (variant, focused, disabled, border, background, text, scaleValue) => {
      const look = resolveFocusLook(variant, focused, disabled);
      expect(look.borderColor).toBe(border);
      expect(look.backgroundColor).toBe(background);
      expect(look.textColor).toBe(text);
      expect(look.scale).toBe(scaleValue);
    },
  );
});
