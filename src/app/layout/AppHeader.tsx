import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, scale, Text} from '~/shared/ui';

import {appContent} from '../content';

/** Global top band. Insights and network status join it in later modules. */
export const AppHeader = () => (
  <View style={styles.bar} pointerEvents="none">
    <View style={styles.brand}>
      <Text weight="semibold" style={styles.wordmark}>
        {appContent.wordmark}
      </Text>
      <Text style={styles.tagline}>{appContent.tagline}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scale(132),
    paddingHorizontal: scale(96),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {flexDirection: 'row', alignItems: 'center', gap: scale(18)},
  wordmark: {fontSize: scale(32), letterSpacing: scale(-0.64)},
  tagline: {fontSize: scale(24), color: colors.textMuted},
});
