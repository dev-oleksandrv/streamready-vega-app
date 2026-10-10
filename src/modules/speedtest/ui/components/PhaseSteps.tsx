import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, scale, Text} from '~/shared/ui';

import {testContent as copy} from '../../content';
import type {StepProgress} from '../../domain/progress';

const STEPS = [
  ['ping', copy.steps.ping],
  ['download', copy.steps.download],
  ['upload', copy.steps.upload],
] as const;

export interface PhaseStepsProps {
  progress: StepProgress;
}

export const PhaseSteps = memo(function PhaseSteps({
  progress,
}: PhaseStepsProps) {
  return (
    <View style={styles.row}>
      {STEPS.map(([key, label]) => {
        const fill = progress[key];
        return (
          <View key={key} style={styles.step}>
            <View style={styles.track}>
              <View style={[styles.fill, {width: `${fill * 100}%`}]} />
            </View>
            <Text
              weight="medium"
              style={[
                styles.label,
                fill > 0 ? styles.started : styles.pending,
              ]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: scale(16)},
  step: {flex: 1, gap: scale(16)},
  track: {
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {height: '100%', borderRadius: scale(3), backgroundColor: colors.lime},
  label: {fontSize: scale(26)},
  started: {color: colors.text},
  pending: {color: colors.textDisabled},
});
