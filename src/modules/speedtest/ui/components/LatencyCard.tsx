import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, radii, scale, Text} from '~/shared/ui';

export interface LatencyCardProps {
  label: string;
  value: string;
}

export const LatencyCard = ({label, value}: LatencyCardProps) => (
  <View style={styles.card}>
    <Text style={styles.label}>{label}</Text>
    <Text weight="semibold" style={styles.value}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    paddingVertical: scale(32),
    paddingHorizontal: scale(36),
    borderRadius: scale(radii.tile),
    backgroundColor: colors.surface,
    gap: scale(10),
  },
  label: {fontSize: scale(24), color: colors.textMuted},
  value: {
    fontSize: scale(64),
    letterSpacing: scale(-1.92),
    fontVariant: ['tabular-nums'],
  },
});
