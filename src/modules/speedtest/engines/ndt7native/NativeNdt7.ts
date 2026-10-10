import type {
  Int32,
  KeplerTurboModule,
} from '@amazon-devices/keplerscript-turbomodule-api';
import {TurboModuleRegistry} from '@amazon-devices/keplerscript-turbomodule-api';

// Codegen input (`pnpm run codegen:ndt7`): it reads only this file, so every
// type it needs is declared here, and it requires the default export below.

/** Native ndt7 subtests. URLs are signed: native code never logs them. */
export interface Ndt7NativeSpec extends KeplerTurboModule {
  /** Spawns a worker for 'download' or 'upload'; events arrive as `ndt7native`. */
  start: (runId: Int32, direction: string, url: string) => void;
  /** Idempotent; unknown runIds are ignored. */
  cancel: (runId: Int32) => void;
}

// `get`, not `getEnforcing`: null when the native library is missing (Jest,
// a broken build), and runs then fail with connect_failed (ADR 0006).
export default TurboModuleRegistry.get<Ndt7NativeSpec>('Ndt7Native');
