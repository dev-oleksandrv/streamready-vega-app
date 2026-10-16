import {Path, Svg} from '@amazon-devices/react-native-svg';
import React from 'react';

export interface ShieldIconProps {
  /** Scaled px. */
  width: number;
  height: number;
  color: string;
  testID?: string;
}

/** 20×22 grid, from the design's VPN badge. */
export const ShieldIcon = ({width, height, color, testID}: ShieldIconProps) => (
  <Svg
    testID={testID}
    width={width}
    height={height}
    viewBox="0 0 20 22"
    fill="none">
    <Path
      d="M10 1.5 2.5 4.5v6c0 4.8 3.2 8.6 7.5 10 4.3-1.4 7.5-5.2 7.5-10v-6L10 1.5Z"
      stroke={color}
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
  </Svg>
);
