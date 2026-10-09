import React, {useState} from 'react';
import {Pressable, StyleSheet} from 'react-native';

import {resolveFocusLook} from './focusLook';
import {scale} from './scale';
import {Text} from './Text';
import {colors, focus, radii} from './tokens';

export interface FocusCardProps {
  title: string;
  subtitle: string;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
  testID?: string;
}

export const FocusCard = ({
  title,
  subtitle,
  onPress,
  hasTVPreferredFocus,
  testID,
}: FocusCardProps) => {
  const [focused, setFocused] = useState(false);
  const look = resolveFocusLook('secondary', focused, false);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.card,
        {
          borderColor: look.borderColor,
          backgroundColor: look.backgroundColor,
          transform: [{scale: look.scale}],
        },
      ]}>
      <Text weight="medium" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: scale(10),
    paddingVertical: scale(28),
    paddingHorizontal: scale(36),
    minWidth: scale(340),
    borderRadius: scale(radii.tile),
    borderWidth: scale(focus.borderWidth),
  },
  title: {fontSize: scale(30)},
  subtitle: {fontSize: scale(24), color: colors.textMuted},
});
