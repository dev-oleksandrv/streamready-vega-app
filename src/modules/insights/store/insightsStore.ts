import {createStore} from 'zustand/vanilla';

import {createLogger} from '~/shared/lib/logger';

import type {ConnectionInfo, GeoIpProvider} from '../domain/connection';
import type {DeviceInfo, DeviceSource} from '../domain/device';
import {
  INITIAL_NETWORK,
  sameNetwork,
  type NetworkStatus,
} from '../domain/network';
import {UNKNOWN_VPN, type VpnSource, type VpnStatus} from '../domain/vpn';

export type InsightsStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface InsightsState {
  connection?: ConnectionInfo;
  device?: DeviceInfo;
  network: NetworkStatus;
  /** Of the geo lookup. */
  status: InsightsStatus;
  /** Never rejects; a failure keeps any cached connection. */
  refreshConnection: () => Promise<void>;
  /** Never rejects; a failure leaves `device` undefined. */
  loadDevice: () => Promise<void>;
  setNetwork: (network: NetworkStatus) => void;
  /** Of the system VPN; refreshed on launch, foreground and test start. */
  vpn: VpnStatus;
  /** Reads the VPN state now; sets it only when it changed. Never throws. */
  refreshVpn: () => VpnStatus;
}

export interface InsightsDeps {
  geo: GeoIpProvider;
  device: DeviceSource;
  vpn?: VpnSource;
}

const log = createLogger('insights');

export function createInsightsStore({
  geo,
  device,
  vpn = UNKNOWN_VPN,
}: InsightsDeps) {
  let inFlight: Promise<void> | undefined;
  return createStore<InsightsState>()((set, get) => ({
    connection: undefined,
    device: undefined,
    network: INITIAL_NETWORK,
    status: 'idle',
    vpn: 'unknown',
    refreshConnection: () => {
      if (!inFlight) {
        set({status: 'loading'});
        // The chain owns the deadline; nothing outside the store needs to cancel it.
        inFlight = geo
          .lookup(new AbortController().signal)
          .then(
            (connection) => {
              set({connection, status: 'ready'});
            },
            (error: unknown) => {
              log.warn('lookup failed', error);
              set({status: 'error'});
            },
          )
          .finally(() => {
            inFlight = undefined;
          });
      }
      return inFlight;
    },
    loadDevice: async () => {
      try {
        set({device: await device.load()});
      } catch (error) {
        log.warn('device info failed', error);
      }
    },
    // Equal readings are dropped so the header doesn't re-render on the 1 GB stick.
    setNetwork: (network) => {
      if (!sameNetwork(get().network, network)) {
        set({network});
      }
    },
    refreshVpn: () => {
      const next = vpn.read();
      if (next !== get().vpn) {
        set({vpn: next});
      }
      return next;
    },
  }));
}

export type InsightsStore = ReturnType<typeof createInsightsStore>;
