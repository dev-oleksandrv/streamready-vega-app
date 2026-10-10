import {NativeEventEmitter} from 'react-native';

import {
  NATIVE_NDT7_ENGINE_ID,
  NativeNdt7Engine,
  nativeNdt7,
  SpeedTestError,
  type NativeEventSource,
  type Ndt7NativeSpec,
  type SpeedTestEngine,
} from '~/modules/speedtest';

import {APP_VERSION} from '../config/app';

// TurboModuleRegistry.get is typed `T | null | undefined`; both mean "missing".
const platformNative: Ndt7NativeSpec | null = nativeNdt7 ?? null;

export function isNativeEngineAvailable(
  native: Ndt7NativeSpec | null = platformNative,
): boolean {
  return native !== null;
}

// Vega: NativeEventEmitter takes no module argument for Turbo Module events.
const platformEvents = (): NativeEventSource => new NativeEventEmitter();

/**
 * The native ndt7 engine is the only engine (ADR 0006). Without the module
 * there is nothing to measure with, so a run fails as a connection problem.
 */
export function createSpeedTestEngine(
  native: Ndt7NativeSpec | null = platformNative,
  createEvents: () => NativeEventSource = platformEvents,
): SpeedTestEngine {
  if (!native) {
    return {
      id: NATIVE_NDT7_ENGINE_ID,
      run: async () => {
        throw new SpeedTestError('connect_failed');
      },
    };
  }
  return new NativeNdt7Engine({
    native,
    events: createEvents(),
    fetch,
    now: Date.now,
    clientVersion: APP_VERSION,
  });
}
