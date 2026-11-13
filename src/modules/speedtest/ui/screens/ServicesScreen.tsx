import React from 'react';
import {StyleSheet, View} from 'react-native';

import {type ServiceVerdict} from '~/modules/verdict';
import {colors, FocusButton, scale, ScreenLayout, Text} from '~/shared/ui';

import {testContent} from '../../content';
import {ServiceRow} from '../components/ServiceRow';

const copy = testContent.services;

export interface ServicesScreenProps {
  rows: readonly ServiceVerdict[];
  /** Speed is enough but lag can still stall; adds a note. */
  laggy: boolean;
  /** Back to Result; the Back key does the same via the stack. */
  onBack: () => void;
}

export const ServicesScreen = ({rows, laggy, onBack}: ServicesScreenProps) => (
  <ScreenLayout style={styles.grid}>
    <View style={styles.left}>
      <Text weight="medium" style={styles.eyebrow}>
        {copy.eyebrow.toUpperCase()}
      </Text>
      <Text weight="semibold" style={styles.headline}>
        {copy.headline}
      </Text>
      <Text style={styles.body}>{copy.disclaimer}</Text>
      {laggy ? <Text style={styles.lag}>{copy.laggy}</Text> : null}
      <FocusButton label={copy.back} onPress={onBack} hasTVPreferredFocus />
    </View>
    <View style={styles.right}>
      {rows.map((row) => (
        <ServiceRow key={row.id} row={row} />
      ))}
    </View>
  </ScreenLayout>
);

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', alignItems: 'center', gap: scale(96)},
  left: {flex: 1, gap: scale(36)},
  eyebrow: {
    fontSize: scale(26),
    letterSpacing: scale(3.64),
    color: colors.textMuted,
  },
  headline: {
    fontSize: scale(88),
    lineHeight: scale(92),
    letterSpacing: scale(-3.96),
  },
  body: {
    fontSize: scale(26),
    lineHeight: scale(38),
    color: colors.textTertiary,
    maxWidth: scale(760),
  },
  lag: {
    fontSize: scale(28),
    lineHeight: scale(40),
    color: colors.amber,
    maxWidth: scale(760),
  },
  right: {width: scale(840), gap: scale(12)},
});
