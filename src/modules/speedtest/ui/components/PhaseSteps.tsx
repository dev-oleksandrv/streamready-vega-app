import React, {memo, useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';

import {colors, scale, Text} from '~/shared/ui';

import {testContent as copy} from '../../content';
import type {StepProgress} from '../../domain/progress';

const STEPS = [
  ['ping', copy.steps.ping],
  ['download', copy.steps.download],
  ['upload', copy.steps.upload],
] as const;

/** One flush interval: the fill reaches each value as the next one arrives. */
const FILL_MS = 250;

interface StepFillProps {
  fill: number;
}

/** Full-width fill scaled from its left edge: scaleX runs on the native driver, width could not. */
const StepFill = ({fill}: StepFillProps) => {
  const scaleX = useRef(new Animated.Value(fill)).current;

  useEffect(() => {
    const glide = Animated.timing(scaleX, {
      toValue: fill,
      duration: FILL_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    glide.start();
    return () => glide.stop();
  }, [fill, scaleX]);

  return <Animated.View style={[styles.fill, {transform: [{scaleX}]}]} />;
};

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
              <StepFill fill={fill} />
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
  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.lime,
    transformOrigin: 'left',
  },
  label: {fontSize: scale(26)},
  started: {color: colors.text},
  pending: {color: colors.textDisabled},
});
