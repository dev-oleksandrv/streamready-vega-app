import {Path, Svg} from '@amazon-devices/react-native-svg';
import React from 'react';

import type {IconProps} from './CheckIcon';

/** 24-unit grid, round stroke; Geist has no ✕ glyph. */
export const CrossIcon = ({size, color, testID}: IconProps) => (
  <Svg
    testID={testID}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none">
    <Path
      d="M6 6l12 12M18 6L6 18"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
