import React, {useEffect, useState} from 'react';
import {Animated, Easing, StyleSheet} from 'react-native';

import {radii, scale} from '~/shared/ui';

export interface BlinkDotProps {
  color: string;
  /** False freezes the dot fully visible (test finished or failed). */
  blinking: boolean;
  /** Design: srBlink 1 s for the live dot, 0.8 s for the server search. */
  periodMs?: number;
}

// CSS `ease-in-out`, as in the design's srBlink keyframes.
const EASE_IN_OUT = Easing.bezier(0.42, 0, 0.58, 1);

export const BlinkDot = ({color, blinking, periodMs = 1000}: BlinkDotProps) => {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!blinking) {
      opacity.setValue(1);
      return;
    }
    const fade = (toValue: number) =>
      Animated.timing(opacity, {
        toValue,
        duration: periodMs / 2,
        easing: EASE_IN_OUT,
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([fade(0.35), fade(1)]));
    loop.start();
    return () => loop.stop();
  }, [blinking, opacity, periodMs]);

  return (
    <Animated.View
      style={[styles.dot, {backgroundColor: color, opacity}]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
};

const styles = StyleSheet.create({
  dot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(radii.pill),
  },
});
