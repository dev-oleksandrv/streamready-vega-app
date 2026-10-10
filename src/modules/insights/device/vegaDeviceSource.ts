import DeviceInfo from '@amazon-devices/react-native-device-info';

import {createLogger, type Logger} from '~/shared/lib/logger';

import type {DeviceSource} from '../domain/device';

/** The two react-native-device-info getters Vega supports that we need. */
export interface DeviceInfoApi {
  getModel(): unknown;
  getSystemVersion(): unknown;
}

function read(getter: () => unknown): string | undefined {
  try {
    const value = getter();
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed === '' || trimmed.toLowerCase() === 'unknown'
      ? undefined
      : trimmed;
  } catch {
    return undefined;
  }
}

export function createVegaDeviceSource(
  api: DeviceInfoApi = DeviceInfo,
  log: Logger = createLogger('insights'),
): DeviceSource {
  let logged = false;
  return {
    load: async () => {
      const info = {
        model: read(() => api.getModel()),
        osVersion: read(() => api.getSystemVersion()),
      };
      if (!logged) {
        logged = true;
        // Dev builds only (logger default): device QA reads the codename to seed
        // DEVICE_PROFILES. A model codename is not personal data.
        log.warn(
          'device',
          info.model ?? 'unknown',
          info.osVersion ?? 'unknown',
        );
      }
      return info;
    },
  };
}
