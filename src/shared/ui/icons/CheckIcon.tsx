import {Path, Svg} from '@amazon-devices/react-native-svg';
import React from 'react';

export interface IconProps {
  /** Scaled px. */
  size: number;
  color: string;
  testID?: string;
}

/** 24-unit grid, round stroke; Geist has no ✓ glyph. */
export const CheckIcon = ({size, color, testID}: IconProps) => (
  <Svg
    testID={testID}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none">
    <Path
      d="M5 12.5l4.5 4.5L19 7"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
