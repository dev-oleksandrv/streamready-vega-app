import {insightsContent as copy} from '../content';
import type {DeviceProfile} from './deviceLimits';
import type {NetworkStatus} from './network';

function wifiName(profile?: DeviceProfile): string {
  return profile?.wifi ?? copy.network.wifi;
}

/** Header and Device screen: includes the band when known. */
export function connectionLabel(
  network: NetworkStatus,
  profile?: DeviceProfile,
): string {
  if (!network.online) {
    return copy.network.offline;
  }
  switch (network.transport) {
    case 'wifi':
      return network.band
        ? `${wifiName(profile)}${copy.separator}${copy.network.band(
            network.band,
          )}`
        : wifiName(profile);
    case 'ethernet':
      return copy.network.ethernet;
    default:
      return copy.network.connected;
  }
}

/** Home card: the design shows "Vega OS · Wi‑Fi 5", without the band. */
export function homeConnectionLabel(
  network: NetworkStatus,
  profile?: DeviceProfile,
): string {
  if (network.online && network.transport === 'wifi') {
    return wifiName(profile);
  }
  return connectionLabel(network, profile);
}

export function deviceSubtitle(
  network: NetworkStatus,
  profile?: DeviceProfile,
): string {
  return `${copy.system}${copy.separator}${homeConnectionLabel(
    network,
    profile,
  )}`;
}

// getSystemName() returns the codename "Kepler", so the OS name is fixed copy.
export function systemLabel(osVersion?: string): string {
  return osVersion ? `${copy.system} ${osVersion}` : copy.system;
}

export function limitLabel(profile?: DeviceProfile): string {
  return profile ? copy.limit(profile.limitMbps) : copy.unknownValue;
}
