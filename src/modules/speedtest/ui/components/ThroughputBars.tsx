import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, scale} from '~/shared/ui';

import type {ThroughputBar} from '../../store/sessionStore';

/** Headroom above the tallest bar, as in the design. */
const HEADROOM = 1.15;
const MIN_HEIGHT_PCT = 2;

interface BarProps {
  heightPct: number;
  color: string;
}

const Bar = memo(function Bar({heightPct, color}: BarProps) {
  return (
    <View
      testID="throughput-bar"
      style={[styles.bar, {height: `${heightPct}%`, backgroundColor: color}]}
    />
  );
});

export interface ThroughputBarsProps {
  bars: readonly ThroughputBar[];
  peakBps: number;
}

export const ThroughputBars = memo(function ThroughputBars({
  bars,
  peakBps,
}: ThroughputBarsProps) {
  const max = Math.max(peakBps, 1) * HEADROOM;
  return (
    <View style={styles.chart}>
      {bars.map((bar, index) => (
        <Bar
          // Bars are append-only, so the index is a stable key.
          key={index}
          heightPct={Math.max(MIN_HEIGHT_PCT, (bar.bps / max) * 100)}
          color={bar.direction === 'download' ? colors.lime : colors.chartMuted}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  chart: {
    height: scale(200),
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scale(6),
    borderBottomWidth: scale(2),
    borderBottomColor: colors.track,
  },
  bar: {
    flex: 1,
    maxWidth: scale(14),
    borderTopLeftRadius: scale(4),
    borderTopRightRadius: scale(4),
  },
});
