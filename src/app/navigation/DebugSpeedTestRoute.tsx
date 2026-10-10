import React, {useCallback} from 'react';

import {useSessionStore} from '~/modules/speedtest';

import {COOLDOWN_MS} from '../config/app';
import {DebugSpeedTestScreen} from '../debug/DebugSpeedTestScreen';
import {
  createSpeedTestEngine,
  isNativeEngineAvailable,
} from '../providers/speedTestEngine';

// Keeps the screen from reaching createSpeedTestEngine's test seams.
const createEngine = () => createSpeedTestEngine();

/** Temporary, __DEV__ only: removed when the real Test UI lands. */
export const DebugSpeedTestRoute = () => {
  const session = useSessionStore();
  const startCooldown = useCallback(
    () => session.getState().startCooldown(Date.now(), COOLDOWN_MS),
    [session],
  );
  return (
    <DebugSpeedTestScreen
      createEngine={createEngine}
      nativeAvailable={isNativeEngineAvailable()}
      onSuccess={startCooldown}
    />
  );
};
