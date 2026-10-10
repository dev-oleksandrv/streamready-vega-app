import * as NetInfo from '@amazon-devices/keplerscript-netmgr-lib';
import type {
  NetInfoConfiguration,
  NetInfoState,
} from '@amazon-devices/keplerscript-netmgr-lib';

import {createLogger, type Logger} from '~/shared/lib/logger';

import {
  bandFromFrequency,
  INITIAL_NETWORK,
  type NetworkMonitor,
  type NetworkStatus,
} from '../domain/network';

export interface NetInfoApi {
  configure(configuration: Partial<NetInfoConfiguration>): void;
  fetch(): Promise<NetInfoState>;
  addEventListener(listener: (state: NetInfoState) => void): () => void;
}

function frequencyOf(state: NetInfoState): number | null | undefined {
  const details = state.details as {frequency?: number | null} | null;
  return details?.frequency;
}

export function toNetworkStatus(state: NetInfoState): NetworkStatus {
  // null means "unknown"; it must never block Start.
  const online = state.isConnected !== false;
  // Compared as a string: the NetInfoStateType enum is a runtime import.
  const type: string = state.type;
  switch (type) {
    case 'wifi': {
      const band = bandFromFrequency(frequencyOf(state));
      return band
        ? {online, transport: 'wifi', band}
        : {online, transport: 'wifi'};
    }
    case 'ethernet':
      return {online, transport: 'ethernet'};
    case 'none':
      return {online, transport: 'none'};
    default:
      return {online, transport: 'other'};
  }
}

export function createNetInfoMonitor(
  api: NetInfoApi = NetInfo,
  log: Logger = createLogger('insights'),
): NetworkMonitor {
  // The default reachability check sends HTTP requests to an external URL;
  // nothing may leave the device before consent. SSID needs the privilege anyway.
  api.configure({
    reachabilityShouldRun: () => false,
    shouldFetchWiFiSSID: false,
  });
  let logged = false;
  const map = (state: NetInfoState): NetworkStatus => {
    if (!logged) {
      logged = true;
      // Dev builds only: QA records whether frequency survives without the privilege.
      log.warn('network', state.type, frequencyOf(state) ?? 'no frequency');
    }
    return toNetworkStatus(state);
  };
  return {
    current: () => api.fetch().then(map, () => INITIAL_NETWORK),
    subscribe: (listener) =>
      api.addEventListener((state) => listener(map(state))),
  };
}
