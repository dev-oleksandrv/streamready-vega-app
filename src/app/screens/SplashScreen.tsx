import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, scale} from '~/shared/ui';

import {Wordmark} from '../layout/Wordmark';

export const SplashScreen = () => (
  <View style={styles.root} testID="splash">
    <Wordmark style={styles.wordmark} />
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
