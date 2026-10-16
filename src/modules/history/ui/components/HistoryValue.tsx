import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

import {colors, scale, Text} from '~/shared/ui';

export interface HistoryValueProps {
  value: string;
  unit: string;
  style?: StyleProp<ViewStyle>;
}

/** A table number with its unit, e.g. "186" + "Mbps". */
export const HistoryValue = ({value, unit, style}: HistoryValueProps) => (
  <View style={[styles.value, style]}>
    <Text weight="medium" style={styles.number}>
      {value}
    </Text>
    <Text style={styles.unit}>{unit}</Text>
  </View>
);

const styles = StyleSheet.create({
  value: {flexDirection: 'row', alignItems: 'baseline', gap: scale(8)},
  number: {fontSize: scale(30), fontVariant: ['tabular-nums']},
  unit: {fontSize: scale(20), color: colors.textMuted},
});
