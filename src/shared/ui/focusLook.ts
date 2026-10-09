import {colors, focus} from './tokens';

export type FocusVariant = 'primary' | 'secondary';

export interface FocusLook {
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  scale: number;
}

export function resolveFocusLook(
  variant: FocusVariant,
  focused: boolean,
  disabled: boolean,
): FocusLook {
  if (disabled) {
    return {
      borderColor: focused ? colors.focusDisabled : 'transparent',
      backgroundColor: colors.surface,
      textColor: colors.textMuted,
      scale: focused ? focus.disabledScale : 1,
    };
  }
  if (focused) {
    const primary = variant === 'primary';
    return {
      borderColor: colors.lime,
      backgroundColor: primary ? colors.lime : colors.surfaceFocused,
      textColor: primary ? colors.onLime : colors.text,
      scale: focus.scale,
    };
  }
  return {
    borderColor: 'transparent',
    backgroundColor:
      variant === 'primary' ? colors.surfaceRaised : colors.surface,
    textColor: colors.text,
    scale: 1,
  };
}
