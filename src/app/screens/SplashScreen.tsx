import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors} from '~/shared/ui';

/**
 * Sits under the native splash (useNativeSplash) while the app loads. Blank on
 * purpose: the native splash carries the wordmark, and a second one here could
 * flash out of place if the two ever disagree.
 */
export const SplashScreen = () => <View style={styles.root} testID="splash" />;

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
});
