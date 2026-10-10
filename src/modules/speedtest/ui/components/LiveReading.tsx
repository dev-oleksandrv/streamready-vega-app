import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, scale, Text} from '~/shared/ui';

import {BlinkDot} from './BlinkDot';

export interface LiveReadingProps {
  label: string;
  value: string;
  unit: string;
  blinking: boolean;
}

export const LiveReading = ({
  label,
  value,
  unit,
  blinking,
}: LiveReadingProps) => (
  <View style={styles.column}>
    <View style={styles.labelRow}>
      <BlinkDot color={colors.lime} blinking={blinking} />
      <Text style={styles.label}>{label}</Text>
    </View>
    <View style={styles.valueRow}>
      <Text weight="semibold" style={styles.value}>
        {value}
      </Text>
      <Text weight="medium" style={styles.unit}>
        {unit}
      </Text>
    </View>
  </View>
);

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
