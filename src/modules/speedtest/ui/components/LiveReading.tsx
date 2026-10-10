import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';

import {colors, scale, Text} from '~/shared/ui';

import {BlinkDot} from './BlinkDot';

export interface LiveReadingProps {
  label: string;
  value: string;
  unit: string;
  blinking: boolean;
}

const FADE_IN_MS = 200;

export const LiveReading = ({
  label,
  value,
  unit,
  blinking,
}: LiveReadingProps) => {
  const opacity = useRef(new Animated.Value(1)).current;
  // Stable style: this view re-renders at 4 Hz during a test.
  const fade = useMemo(() => ({opacity}), [opacity]);

  // A new phase fades in. Layout effect: hidden before the new text paints, so it never flashes.
  useLayoutEffect(() => {
    opacity.setValue(0);
    const fadeIn = Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_IN_MS,
      useNativeDriver: true,
    });
    fadeIn.start();
    return () => fadeIn.stop();
  }, [label, opacity]);

  return (
    <View style={styles.column}>
      <View style={styles.labelRow}>
        <BlinkDot color={colors.lime} blinking={blinking} />
        <Animated.View style={fade}>
          <Text style={styles.label}>{label}</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.valueRow, fade]}>
        <Text weight="semibold" style={styles.value}>
          {value}
        </Text>
        <Text weight="medium" style={styles.unit}>
          {unit}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  column: {gap: scale(8)},
  labelRow: {flexDirection: 'row', alignItems: 'center', gap: scale(14)},
  label: {fontSize: scale(30), color: colors.textSecondary},
  valueRow: {flexDirection: 'row', alignItems: 'baseline', gap: scale(24)},
  value: {
    fontSize: scale(300),
    lineHeight: scale(300),
    letterSpacing: scale(-18),
    fontVariant: ['tabular-nums'],
  },
  unit: {fontSize: scale(56), color: colors.textMuted},
});
