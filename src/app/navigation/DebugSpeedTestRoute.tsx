import React from 'react';

import {DebugSpeedTestScreen} from '../debug/DebugSpeedTestScreen';
import {createSpeedTestEngine} from '../providers/speedTestEngine';

/** Temporary, __DEV__ only: removed when the real Test UI lands. */
export const DebugSpeedTestRoute = () => (
  <DebugSpeedTestScreen createEngine={createSpeedTestEngine} />
);
