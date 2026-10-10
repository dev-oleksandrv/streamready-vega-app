import React, {memo, useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';

import {colors, scale} from '~/shared/ui';

import type {ThroughputBar} from '../../store/sessionStore';
import {barFraction, chartTopBps} from '../chartScale';

/** A new bar grows in, and a rescale glides, within one 250 ms flush. */
const GROW_MS = 220;
const EASE_OUT = Easing.out(Easing.cubic);

interface BarProps {
  fraction: number;
  color: string;
}

/**
 * Full-height bar scaled from its bottom edge: scaleY runs on the native
 * driver, where an animated height could not.
 */
const Bar = memo(function Bar({fraction, color}: BarProps) {
  const scaleY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const grow = Animated.timing(scaleY, {
      toValue: fraction,
      duration: GROW_MS,
      easing: EASE_OUT,
      useNativeDriver: true,
    });
    grow.start();
    return () => grow.stop();
  }, [fraction, scaleY]);

  return (
    <Animated.View
      testID="throughput-bar"
      style={[styles.bar, {backgroundColor: color, transform: [{scaleY}]}]}
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
  const topBps = chartTopBps(peakBps);
  return (
    <View style={styles.chart}>
      {bars.map((bar, index) => (
        <Bar
          // Bars are append-only, so the index is a stable key.
          key={index}
          fraction={barFraction(bar.bps, topBps)}
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
    height: '100%',
    maxWidth: scale(14),
    borderTopLeftRadius: scale(4),
    borderTopRightRadius: scale(4),
    transformOrigin: 'bottom',
  },
});
