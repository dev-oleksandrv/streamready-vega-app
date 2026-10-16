import type {
  Int32,
  KeplerTurboModule,
} from '@amazon-devices/keplerscript-turbomodule-api';
import {TurboModuleRegistry} from '@amazon-devices/keplerscript-turbomodule-api';

// Codegen input (`pnpm run codegen:vpn`): it reads only this file, so every
// type it needs is declared here, and it requires the default export below.

/** Vega system VPN state, read through IVpnManager (ADR 0011). */
export interface VpnNativeSpec extends KeplerTurboModule {
  /** Raw VpnState (0 unknown, 1 down, 2 up, 3 connected, 4 disconnected); -1 on any failure. */
  getVpnState: () => Int32;
}

// `get`, not `getEnforcing`: null when the native library is missing (Jest,
// a broken build); the VPN then reads as unknown.
export default TurboModuleRegistry.get<VpnNativeSpec>('VpnNative');
