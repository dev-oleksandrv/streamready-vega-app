import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet} from 'react-native';

import {colors, radii, scale} from '~/shared/ui';

const PULSE_MS = 2200;
// CSS `ease-out`, as in the design's srPulse keyframes.
const EASE_OUT = Easing.bezier(0, 0, 0.58, 1);

/** Lime ring that grows and fades around a ready, focused Start. Mount it only while it should run. */
export const PulseRing = () => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: PULSE_MS,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const ringScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.28],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

  return (
    <Animated.View
      testID="start-pulse"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.ring, {opacity, transform: [{scale: ringScale}]}]}
    />
  );
};

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: scale(-3),
    left: scale(-3),
    right: scale(-3),
    bottom: scale(-3),
    borderRadius: scale(radii.pill),
    borderWidth: scale(3),
    borderColor: colors.lime,
  },
});
