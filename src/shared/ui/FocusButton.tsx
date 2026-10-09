import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet} from 'react-native';

import {resolveFocusLook, type FocusVariant} from './focusLook';
import {scale} from './scale';
import {Spinner} from './Spinner';
import {Text} from './Text';
import {focus, radii} from './tokens';

export interface FocusButtonProps {
  label: string;
  onPress: () => void;
  variant?: FocusVariant;
  /** Stays focusable so D-pad focus never jumps; presses are ignored. */
  disabled?: boolean;
  loading?: boolean;
  hasTVPreferredFocus?: boolean;
  testID?: string;
}

export const FocusButton = ({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  loading = false,
  hasTVPreferredFocus,
  testID,
}: FocusButtonProps) => {
  const [focused, setFocused] = useState(false);
  const look = resolveFocusLook(variant, focused, disabled);
  const inert = disabled || loading;

  const handlePress = useCallback(() => {
    if (!inert) {
      onPress();
    }
  }, [inert, onPress]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled, busy: loading}}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={handlePress}
      style={[
        styles.base,
        {
          borderColor: look.borderColor,
          backgroundColor: look.backgroundColor,
          transform: [{scale: look.scale}],
        },
      ]}>
      {loading ? <Spinner color={look.textColor} /> : null}
      <Text
        weight={variant === 'primary' ? 'semibold' : 'medium'}
        style={[styles.label, {color: look.textColor}]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: scale(16),
    paddingVertical: scale(22),
    paddingHorizontal: scale(40),
    borderRadius: scale(radii.pill),
    borderWidth: scale(focus.borderWidth),
  },
  label: {
    fontSize: scale(28),
  },
});
