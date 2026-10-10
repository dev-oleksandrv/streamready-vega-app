import {NativeEventEmitter} from 'react-native';

import {
  DEFAULT_UPLOAD_WINDOW_BYTES,
  FallbackEngine,
  NATIVE_NDT7_ENGINE_ID,
  NativeNdt7Engine,
  nativeNdt7,
  Ndt7Engine,
  SpeedTestError,
  type DownloadMode,
  type NativeEventSource,
  type Ndt7NativeSpec,
  type Ndt7Socket,
  type SpeedTestEngine,
} from '~/modules/speedtest';

import {APP_VERSION} from '../config/app';

/** auto: native with JS fallback (production); native/js: one engine only (debug). */
export type EngineChoice = 'auto' | 'native' | 'js';

export const ENGINE_CHOICES: readonly EngineChoice[] = ['auto', 'native', 'js'];

export interface SpeedTestEngineConfig {
  engine: EngineChoice;
  /** JS engine only. */
  downloadMode: DownloadMode;
  /** JS engine only. */
  uploadWindowBytes: number;
}

export const defaultSpeedTestEngineConfig: SpeedTestEngineConfig = {
  engine: 'auto',
  downloadMode: 'arraybuffer',
  uploadWindowBytes: DEFAULT_UPLOAD_WINDOW_BYTES,
};

// TurboModuleRegistry.get is typed `T | null | undefined`; both mean "missing".
const platformNative: Ndt7NativeSpec | null = nativeNdt7 ?? null;

// Vega: NativeEventEmitter takes no module argument for Turbo Module events.
export function isNativeEngineAvailable(
  native: Ndt7NativeSpec | null = platformNative,
): boolean {
  return native !== null;
}

const platformEvents = (): NativeEventSource => new NativeEventEmitter();

function createJsEngine({
  downloadMode,
  uploadWindowBytes,
}: SpeedTestEngineConfig): SpeedTestEngine {
  return new Ndt7Engine({
    // The platform WebSocket implements Ndt7Socket at runtime; its typings omit
    // binaryType and bufferedAmount and use DOM event types, hence the cast.
    createSocket: (url, protocol) =>
      new WebSocket(url, protocol) as unknown as Ndt7Socket,
    fetch,
    now: Date.now,
    clientVersion: APP_VERSION,
    downloadMode,
    uploadWindowBytes,
  });
}

function createNativeEngine(
  native: Ndt7NativeSpec | null,
  createEvents: () => NativeEventSource,
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

export function createSpeedTestEngine(
  config: SpeedTestEngineConfig = defaultSpeedTestEngineConfig,
  native: Ndt7NativeSpec | null = platformNative,
  createEvents: () => NativeEventSource = platformEvents,
): SpeedTestEngine {
  switch (config.engine) {
    case 'js':
      return createJsEngine(config);
    case 'native':
      return createNativeEngine(native, createEvents);
    case 'auto':
      return native
        ? new FallbackEngine(
            createNativeEngine(native, createEvents),
            createJsEngine(config),
          )
        : createJsEngine(config);
  }
}
