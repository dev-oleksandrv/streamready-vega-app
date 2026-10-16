import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {resolveFocusLook} from './focusLook';
import {scale} from './scale';
import {Text} from './Text';
import {colors, focus, radii} from './tokens';

export interface FocusSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  hasTVPreferredFocus?: boolean;
  testID?: string;
}

/** A pill with a label and an on/off track; OK flips it. */
export const FocusSwitch = ({
  label,
  value,
  onValueChange,
  hasTVPreferredFocus,
  testID,
}: FocusSwitchProps) => {
  const [focused, setFocused] = useState(false);
  const look = resolveFocusLook('secondary', focused, false);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{checked: value}}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => onValueChange(!value)}
      style={[
        styles.pill,
        {
          borderColor: look.borderColor,
          backgroundColor: look.backgroundColor,
          transform: [{scale: look.scale}],
        },
      ]}>
      <Text weight="medium" style={[styles.label, {color: look.textColor}]}>
        {label}
      </Text>
      <View style={[styles.track, value ? styles.trackOn : styles.trackOff]}>
        <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
      </View>
    </Pressable>
  );
};

const KNOB_INSET = 5;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(20),
    paddingVertical: scale(16),
    paddingLeft: scale(36),
    paddingRight: scale(20),
    borderRadius: scale(radii.pill),
    borderWidth: scale(focus.borderWidth),
  },
  label: {fontSize: scale(28)},
  track: {
    width: scale(76),
    height: scale(44),
    borderRadius: scale(radii.pill),
  },
  trackOn: {backgroundColor: colors.lime},
  trackOff: {backgroundColor: colors.borderStrong},
  knob: {
    position: 'absolute',
    top: scale(KNOB_INSET),
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
  },
  knobOn: {left: scale(37), backgroundColor: colors.onLime},
  knobOff: {left: scale(KNOB_INSET), backgroundColor: colors.textMuted},
});
