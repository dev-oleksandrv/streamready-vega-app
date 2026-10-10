import React from 'react';

import {DebugSpeedTestScreen} from '../debug/DebugSpeedTestScreen';
import {
  createSpeedTestEngine,
  isNativeEngineAvailable,
} from '../providers/speedTestEngine';

// Keeps the screen from reaching createSpeedTestEngine's test seams.
const createEngine = () => createSpeedTestEngine();

/** Temporary, __DEV__ only: removed when the real Test UI lands. */
export const DebugSpeedTestRoute = () => (
  <DebugSpeedTestScreen
    createEngine={createEngine}
    nativeAvailable={isNativeEngineAvailable()}
  />
);
