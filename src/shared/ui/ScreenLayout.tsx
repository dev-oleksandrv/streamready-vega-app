import React, {type ReactNode} from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

import {scale} from './scale';
import {colors} from './tokens';

export interface ScreenLayoutProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Full-screen frame below the global header (132 px band at the top). */
export const ScreenLayout = ({children, style}: ScreenLayoutProps) => (
  <View style={[styles.frame, style]}>{children}</View>
);

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: scale(132),
    paddingHorizontal: scale(96),
    paddingBottom: scale(96),
  },
});
