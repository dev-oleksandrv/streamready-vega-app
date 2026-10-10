import React from 'react';

import {DebugSpeedTestScreen} from '../debug/DebugSpeedTestScreen';
import {
  createSpeedTestEngine,
  isNativeEngineAvailable,
  type SpeedTestEngineConfig,
} from '../providers/speedTestEngine';

// Keeps the screen from reaching createSpeedTestEngine's test seams.
const createEngine = (config: SpeedTestEngineConfig) =>
  createSpeedTestEngine(config);

/** Temporary, __DEV__ only: removed when the real Test UI lands. */
export const DebugSpeedTestRoute = () => (
  <DebugSpeedTestScreen
    createEngine={createEngine}
    nativeAvailable={isNativeEngineAvailable()}
  />
);
