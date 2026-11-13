import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';

import {verdictContent, type ServiceVerdict} from '~/modules/verdict';
import {colors, radii, scale, Text} from '~/shared/ui';

export interface ServiceRowProps {
  row: ServiceVerdict;
}

/** Display only: not focusable, the screen's Back button owns focus. */
export const ServiceRow = memo(function ServiceRow({row}: ServiceRowProps) {
  const copy = verdictContent.services;
  const quality = row.best ? copy.tiers[row.best.tier] : copy.none;
  return (
    <View style={styles.row}>
      <Text weight="medium" style={styles.name}>
        {copy.names[row.id]}
      </Text>
      <View style={styles.detail}>
        <Text
          weight="semibold"
          style={[styles.quality, row.best ? styles.reached : styles.missed]}>
          {quality}
        </Text>
        {row.next ? (
          <Text style={styles.next}>{copy.next(row.next)}</Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(24),
    paddingVertical: scale(16),
    paddingHorizontal: scale(32),
    borderRadius: scale(radii.card),
    backgroundColor: colors.surface,
  },
  name: {fontSize: scale(30)},
  detail: {alignItems: 'flex-end', gap: scale(2)},
  quality: {fontSize: scale(28)},
  reached: {color: colors.lime},
  missed: {color: colors.textMuted},
  next: {fontSize: scale(22), color: colors.textMuted},
});
