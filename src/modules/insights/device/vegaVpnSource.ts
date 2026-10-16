import {createLogger, type Logger} from '~/shared/lib/logger';

import {vpnStatusFromState, type VpnSource} from '../domain/vpn';
import nativeVpn, {type VpnNativeSpec} from './NativeVpn';

export function createVegaVpnSource(
  api: Pick<VpnNativeSpec, 'getVpnState'> | null | undefined = nativeVpn,
  log: Logger = createLogger('insights'),
): VpnSource {
  let logged = false;
  // Dev builds only (logger default): device QA reads whether the module is
  // linked and what the system returns. A VPN state is not personal data.
  const logOnce = (...args: unknown[]) => {
    if (!logged) {
      logged = true;
      log.warn('vpn', ...args);
    }
  };
  return {
    read: () => {
      if (!api) {
        logOnce('no module');
        return 'unknown';
      }
      try {
        const raw = api.getVpnState();
        logOnce('module', raw);
        return vpnStatusFromState(raw);
      } catch (error) {
        logOnce('module threw');
        log.warn('vpn state failed', error);
        return 'unknown';
      }
    },
  };
}
