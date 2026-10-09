import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet} from 'react-native';

import {scale} from './scale';

export interface SpinnerProps {
  color: string;
  /** Diameter in design px. */
  size?: number;
}

export const Spinner = ({color, size = 24}: SpinnerProps) => {
  const turn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn]);

  const rotate = turn.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const diameter = scale(size);

  return (
    <Animated.View
      testID="spinner"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.ring,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          borderColor: color,
          transform: [{rotate}],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  ring: {
    borderWidth: scale(3),
    borderRightColor: 'transparent',
  },
});
