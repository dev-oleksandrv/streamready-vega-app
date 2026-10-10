import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, scale, Text} from '~/shared/ui';

export interface DebugRowProps {
  label: string;
  value: string;
}

export const DebugRow = ({label, value}: DebugRowProps) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text mono style={styles.value}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: scale(24)},
  label: {width: scale(260), fontSize: scale(28), color: colors.textSecondary},
  // Long values (server names) wrap inside the column instead of overflowing.
  value: {flexShrink: 1, fontSize: scale(28)},
});
