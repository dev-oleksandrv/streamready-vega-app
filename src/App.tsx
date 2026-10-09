import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors} from '~/shared/ui/tokens';

export const App = () => (
  <View style={styles.container}>
    <Text style={styles.title}>StreamReady</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 64,
    fontWeight: '600',
  },
});
