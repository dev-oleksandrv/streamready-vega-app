import React from 'react';
import {
  Text as RNText,
  StyleSheet,
  type TextProps as RNTextProps,
} from 'react-native';

import {fontFamilyFor, type FontWeight} from './fonts';
import {colors} from './tokens';

export interface TextProps extends RNTextProps {
  weight?: FontWeight;
  mono?: boolean;
}

export const Text = ({
  weight = 'regular',
  mono = false,
  style,
  ...rest
}: TextProps) => (
  <RNText
    {...rest}
    style={[styles.base, {fontFamily: fontFamilyFor(weight, mono)}, style]}
  />
);

const styles = StyleSheet.create({
  base: {color: colors.text},
});
