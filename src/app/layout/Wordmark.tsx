import React from 'react';
import {StyleSheet, type StyleProp, type TextStyle} from 'react-native';

import {colors, Text} from '~/shared/ui';

import {appContent} from '../content';

interface WordmarkProps {
  style?: StyleProp<TextStyle>;
}

/** Nested Text keeps the brand one run of text, so size and kerning apply to both halves. */
export const Wordmark = ({style}: WordmarkProps) => (
  <Text weight="semibold" style={style}>
    {appContent.wordmark.lead}
    <Text weight="semibold" testID="wordmark-accent" style={styles.accent}>
      {appContent.wordmark.accent}
    </Text>
  </Text>
);

const styles = StyleSheet.create({
  accent: {color: colors.lime},
});
