import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, scale, Text} from '~/shared/ui';

import type {PolicySectionContent} from '../../content';

export const PolicySection = memo(({n, title, body}: PolicySectionContent) => (
  <View style={styles.section}>
    <View style={styles.heading}>
      <Text mono style={styles.number}>
        {n}
      </Text>
      <Text weight="semibold" style={styles.title}>
        {title}
      </Text>
    </View>
    <Text style={styles.body}>{body}</Text>
  </View>
));

const styles = StyleSheet.create({
  section: {gap: scale(14)},
  heading: {flexDirection: 'row', alignItems: 'baseline', gap: scale(20)},
  number: {fontSize: scale(22), color: colors.lime},
  title: {fontSize: scale(36), letterSpacing: scale(-0.72)},
  body: {
    fontSize: scale(26),
    lineHeight: scale(40.3),
    color: colors.textTertiary,
    paddingLeft: scale(52),
  },
});
