import {createLogger, type Logger} from '~/shared/lib/logger';

import {vpnStatusFromState, type VpnSource} from '../domain/vpn';
import nativeVpn, {type VpnNativeSpec} from './NativeVpn';

export function createVegaVpnSource(
  api: Pick<VpnNativeSpec, 'getVpnState'> | null | undefined = nativeVpn,
  log: Logger = createLogger('insights'),
): VpnSource {
  return {
    read: () => {
      if (!api) {
        return 'unknown';
      }
      try {
        return vpnStatusFromState(api.getVpnState());
      } catch (error) {
        log.warn('vpn state failed', error);
        return 'unknown';
      }
    },
  };
}
