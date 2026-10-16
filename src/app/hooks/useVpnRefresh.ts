import {useEffect, useRef} from 'react';
import {AppState} from 'react-native';

import {useInsightsStore, type VpnStatus} from '~/modules/insights';
import {useConsent} from '~/modules/privacy';

const isKnown = (vpn: VpnStatus) => vpn !== 'unknown';

/**
 * Reads the system VPN on mount and whenever the app returns to the
 * foreground: a VPN is switched on or off in another app (ADR 0011).
 * A switch changes the public IP, so geo insights are refreshed with it.
 */
export function useVpnRefresh(): void {
  const store = useInsightsStore();
  const consent = useConsent((s) => s.status);
  // Read inside the AppState listener, which is subscribed once.
  const consentRef = useRef(consent);
  consentRef.current = consent;

  useEffect(() => {
    store.getState().refreshVpn();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        return;
      }
      const before = store.getState().vpn;
      const after = store.getState().refreshVpn();
      if (
        consentRef.current === 'accepted' &&
        isKnown(before) &&
        isKnown(after) &&
        before !== after
      ) {
        store.getState().refreshConnection();
      }
    });
    return () => subscription.remove();
  }, [store]);
}
