import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, scale, Text} from '~/shared/ui';

export interface DeviceRowProps {
  label: string;
  value: string;
  last: boolean;
}

export const DeviceRow = memo(function DeviceRow({
  label,
  value,
  last,
}: DeviceRowProps) {
  return (
    <View style={[styles.row, last ? null : styles.divider]}>
      <Text style={styles.label}>{label}</Text>
      <Text weight="medium" style={styles.value}>
        {value}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: scale(24),
    paddingVertical: scale(30),
  },
  divider: {borderBottomWidth: scale(2), borderBottomColor: colors.border},
  label: {fontSize: scale(28), color: colors.textMuted},
  value: {fontSize: scale(30)},
});
