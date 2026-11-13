import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, radii, scale, Text} from '~/shared/ui';

export interface LatencyStatCardProps {
  label: string;
  value: string;
  unit: string;
  valueColor?: string;
  /** Optional line under the reading, e.g. a level label. */
  caption?: string;
  captionColor?: string;
}

export const LatencyStatCard = ({
  label,
  value,
  unit,
  valueColor,
  caption,
  captionColor,
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
    {caption !== undefined && (
      <Text
        weight="medium"
        style={[
          styles.caption,
          captionColor !== undefined && {color: captionColor},
        ]}>
        {caption}
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingVertical: scale(32),
    paddingHorizontal: scale(28),
    borderRadius: scale(radii.panel),
    backgroundColor: colors.surface,
    gap: scale(8),
  },
  label: {fontSize: scale(24), color: colors.textMuted},
  reading: {flexDirection: 'row', alignItems: 'baseline', gap: scale(8)},
  value: {fontSize: scale(84), letterSpacing: scale(-4.2)},
  unit: {fontSize: scale(28), color: colors.textMuted},
  caption: {fontSize: scale(26), color: colors.textMuted},
});
