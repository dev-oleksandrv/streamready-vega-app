import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, radii, scale, Text} from '~/shared/ui';

export interface LatencyStatCardProps {
  label: string;
  value: string;
  unit: string;
  valueColor?: string;
}

export const LatencyStatCard = ({
  label,
  value,
  unit,
  valueColor,
}: LatencyStatCardProps) => (
  <View style={styles.card}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.reading}>
      <Text
        weight="semibold"
        style={[styles.value, valueColor !== undefined && {color: valueColor}]}>
        {value}
      </Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingVertical: scale(36),
    paddingHorizontal: scale(40),
    borderRadius: scale(radii.panel),
    backgroundColor: colors.surface,
    gap: scale(8),
  },
  label: {fontSize: scale(24), color: colors.textMuted},
  reading: {flexDirection: 'row', alignItems: 'baseline', gap: scale(12)},
  value: {fontSize: scale(96), letterSpacing: scale(-4.8)},
  unit: {fontSize: scale(30), color: colors.textMuted},
});
