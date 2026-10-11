import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, radii, scale, Text} from '~/shared/ui';

export interface StatTileProps {
  label: string;
  value: string;
  caption: string;
  valueColor?: string;
}

export const StatTile = ({
  label,
  value,
  caption,
  valueColor,
}: StatTileProps) => (
  <View style={styles.tile}>
    <Text style={styles.label}>{label}</Text>
    <Text
      weight="semibold"
      style={[styles.value, valueColor !== undefined && {color: valueColor}]}>
      {value}
    </Text>
    <Text style={styles.caption}>{caption}</Text>
  </View>
);

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    paddingVertical: scale(28),
    paddingHorizontal: scale(30),
    borderRadius: scale(radii.tile),
    backgroundColor: colors.surface,
    gap: scale(8),
  },
  label: {fontSize: scale(22), color: colors.textMuted},
  value: {fontSize: scale(48), letterSpacing: scale(-1.44)},
  caption: {fontSize: scale(20), color: colors.textMuted},
});
