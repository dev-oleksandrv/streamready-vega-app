import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';

import {LAG_GRADE_ORDER, type LagGrade} from '~/modules/verdict';
import {colors, radii, scale, Text} from '~/shared/ui';

import {testContent} from '../../content';

const copy = testContent.latency;

export interface GradeScaleProps {
  grade: LagGrade;
  activeColor: string;
}

export const GradeScale = memo(function GradeScale({
  grade,
  activeColor,
}: GradeScaleProps) {
  return (
    <View style={styles.scale}>
      <View style={styles.cells}>
        {LAG_GRADE_ORDER.map((letter) => {
          const active = letter === grade;
          return (
            <View
              key={letter}
              testID={`grade-${letter}`}
              style={[styles.cell, active && {backgroundColor: activeColor}]}>
              <Text
                weight="semibold"
                style={[styles.letter, active ? styles.active : styles.idle]}>
                {letter}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.ends}>
        <Text style={styles.end}>{copy.smooth}</Text>
        <Text style={styles.end}>{copy.stalls}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  scale: {gap: scale(20)},
  cells: {flexDirection: 'row', gap: scale(12)},
  cell: {
    flex: 1,
    height: scale(120),
    borderRadius: scale(radii.card),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {fontSize: scale(52)},
  active: {color: colors.onLime},
  idle: {color: colors.textDisabled},
  ends: {flexDirection: 'row', justifyContent: 'space-between'},
  end: {fontSize: scale(22), color: colors.textMuted},
});
