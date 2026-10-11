import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';

import {CheckIcon, colors, CrossIcon, radii, scale, Text} from '~/shared/ui';

export interface StreamCheckProps {
  label: string;
  need: string;
  passed: boolean;
}

export const StreamCheck = memo(function StreamCheck({
  label,
  need,
  passed,
}: StreamCheckProps) {
  return (
    <View style={styles.tile}>
      <View
        testID="check-badge"
        style={[styles.badge, passed ? styles.passed : styles.failed]}>
        {passed ? (
          <CheckIcon
            testID="check-passed"
            size={scale(28)}
            color={colors.onLime}
          />
        ) : (
          <CrossIcon
            testID="check-failed"
            size={scale(28)}
            color={colors.coral}
          />
        )}
      </View>
      <View style={styles.text}>
        <Text weight="medium" style={styles.label}>
          {label}
        </Text>
        <Text style={styles.need}>{need}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(22),
    paddingVertical: scale(24),
    paddingHorizontal: scale(28),
    borderRadius: scale(radii.card),
    backgroundColor: colors.surface,
  },
  badge: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    alignItems: 'center',
    justifyContent: 'center',
  },
  passed: {backgroundColor: colors.lime},
  failed: {backgroundColor: colors.failSurface},
  text: {gap: scale(4)},
  label: {fontSize: scale(30)},
  need: {fontSize: scale(22), color: colors.textMuted},
});
