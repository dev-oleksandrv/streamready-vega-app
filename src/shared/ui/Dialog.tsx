// TVFocusGuideView is missing from the upstream react-native typings.
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import React, {type ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';

import {scale} from './scale';
import {Text} from './Text';
import {colors, radii} from './tokens';

export interface DialogProps {
  visible: boolean;
  title: string;
  body: string;
  actions: ReactNode;
  hint?: string;
}

export const Dialog = ({visible, title, body, actions, hint}: DialogProps) => {
  if (!visible) {
    return null;
  }
  return (
    <View style={styles.overlay}>
      <View style={styles.card} accessibilityViewIsModal>
        <Text weight="semibold" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
        {/* Trap focus so the D-pad can't reach the screen behind the overlay. */}
        <TVFocusGuideView
          autoFocus
          trapFocusUp
          trapFocusDown
          trapFocusLeft
          trapFocusRight
          style={styles.actions}>
          {actions}
        </TVFocusGuideView>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: scale(880),
    padding: scale(64),
    gap: scale(28),
    borderRadius: scale(radii.dialog),
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: scale(64),
    lineHeight: scale(67),
    letterSpacing: scale(-2.2),
  },
  body: {
    fontSize: scale(30),
    lineHeight: scale(43.5),
    color: colors.textSecondary,
  },
  actions: {flexDirection: 'row', gap: scale(20), marginTop: scale(20)},
  hint: {fontSize: scale(24), color: colors.textMuted},
});
