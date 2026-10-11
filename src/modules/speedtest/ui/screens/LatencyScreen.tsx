import React from 'react';
import {StyleSheet, View} from 'react-native';

import {verdictContent, type Verdict} from '~/modules/verdict';
import {formatMs} from '~/shared/lib/format';
import {colors, FocusButton, scale, ScreenLayout, Text} from '~/shared/ui';

import {testContent} from '../../content';
import type {SpeedTestResult} from '../../domain/engine';
import {GradeScale} from '../components/GradeScale';
import {LatencyStatCard} from '../components/LatencyStatCard';
import {toneColor} from '../toneColor';

const copy = testContent.latency;

export interface LatencyScreenProps {
  result: SpeedTestResult;
  verdict: Verdict;
  /** Back to Result; the Back key does the same via the stack. */
  onBack: () => void;
}

export const LatencyScreen = ({
  result,
  verdict,
  onBack,
}: LatencyScreenProps) => {
  const gradeColor = toneColor(verdict.gradeTone);
  return (
    <ScreenLayout style={styles.grid}>
      <View style={styles.left}>
        <Text weight="medium" style={styles.eyebrow}>
          {copy.eyebrow.toUpperCase()}
        </Text>
        <Text weight="semibold" style={styles.headline}>
          {verdictContent.latencyHeadline(verdict.grade)}
        </Text>
        <Text style={styles.body}>{copy.body}</Text>
        <FocusButton label={copy.back} onPress={onBack} hasTVPreferredFocus />
      </View>
      <View style={styles.right}>
        <View style={styles.cards}>
          <LatencyStatCard
            label={copy.idle}
            value={formatMs(result.idleLatencyMs)}
            unit={testContent.units.ms}
          />
          <LatencyStatCard
            label={copy.loaded}
            value={formatMs(result.loadedLatencyMs)}
            unit={testContent.units.ms}
            valueColor={gradeColor}
          />
        </View>
        <GradeScale grade={verdict.grade} activeColor={gradeColor} />
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', alignItems: 'center', gap: scale(120)},
  left: {flex: 1, gap: scale(36)},
  eyebrow: {
    fontSize: scale(26),
    letterSpacing: scale(3.64),
    color: colors.textMuted,
  },
  headline: {
    fontSize: scale(104),
    lineHeight: scale(104),
    letterSpacing: scale(-4.68),
  },
  body: {
    fontSize: scale(32),
    lineHeight: scale(46.4),
    color: colors.textTertiary,
    maxWidth: scale(820),
  },
  right: {flex: 1, gap: scale(48)},
  cards: {flexDirection: 'row', gap: scale(16)},
});
