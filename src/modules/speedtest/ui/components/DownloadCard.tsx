import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, radii, scale, Text} from '~/shared/ui';

export interface DownloadCardProps {
  label: string;
  value: string;
  unit: string;
  note?: string;
}

export const DownloadCard = ({label, value, unit, note}: DownloadCardProps) => (
  <View style={styles.card}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.reading}>
      <Text weight="semibold" style={styles.value}>
        {value}
      </Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
    {note ? <Text style={styles.note}>{note}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  card: {
    paddingVertical: scale(36),
    paddingHorizontal: scale(40),
    borderRadius: scale(radii.panel),
    backgroundColor: colors.surface,
    gap: scale(8),
  },
  label: {fontSize: scale(26), color: colors.textMuted},
  reading: {flexDirection: 'row', alignItems: 'baseline', gap: scale(16)},
  value: {
    fontSize: scale(120),
    lineHeight: scale(120),
    letterSpacing: scale(-6),
    fontVariant: ['tabular-nums'],
  },
  unit: {fontSize: scale(34), color: colors.textMuted},
  note: {
    fontSize: scale(22),
    color: colors.textSecondary,
    marginTop: scale(8),
  },
});
