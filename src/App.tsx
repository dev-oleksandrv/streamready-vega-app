import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, Text} from '~/shared/ui';

export const App = () => (
  <View style={styles.container}>
    <Text weight="semibold" style={styles.title}>
      StreamReady
    </Text>
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
  },
});
