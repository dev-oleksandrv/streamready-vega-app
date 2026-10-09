import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, scale, Text} from '~/shared/ui';

import {appContent} from '../content';

export const SplashScreen = () => (
  <View style={styles.root} testID="splash">
    <Text weight="semibold" style={styles.wordmark}>
      {appContent.wordmark}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  wordmark: {fontSize: scale(64), letterSpacing: scale(-1.28)},
});
