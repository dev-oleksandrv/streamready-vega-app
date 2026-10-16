import React, {memo, useEffect, useMemo, useState} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';

import {colors, scale} from '~/shared/ui';

import {CHART_SLOTS, type ThroughputBar} from '../../store/sessionStore';
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
  const [scaleY] = useState(() => new Animated.Value(0));

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
  const bySlot = useMemo(() => {
    const slots = new Array<ThroughputBar | undefined>(CHART_SLOTS).fill(
      undefined,
    );
    for (const bar of bars) {
      slots[bar.slot] = bar;
    }
    return slots;
  }, [bars]);
  return (
    <View style={styles.chart}>
      {bySlot.map((bar, slot) =>
        bar === undefined ? (
          <View key={slot} testID="throughput-slot" style={styles.slot} />
        ) : (
          <Bar
            key={slot}
            fraction={barFraction(bar.bps, topBps)}
            color={
              bar.direction === 'download' ? colors.lime : colors.chartMuted
            }
          />
        ),
      )}
    </View>
  );
});

// scaleY also scales the top radius, so very short bars look flatter; accepted for native-driven growth.
const styles = StyleSheet.create({
  chart: {
    height: scale(200),
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scale(6),
    borderBottomWidth: scale(2),
    borderBottomColor: colors.track,
  },
  // Every slot takes its share of the width, filled or not, so the chart always spans it.
  slot: {flex: 1},
  bar: {
    flex: 1,
    height: '100%',
    borderTopLeftRadius: scale(4),
    borderTopRightRadius: scale(4),
    transformOrigin: 'bottom',
  },
});
