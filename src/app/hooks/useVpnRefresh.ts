import {useEffect} from 'react';
import {AppState} from 'react-native';

import {useInsightsStore} from '~/modules/insights';

/**
 * Reads the system VPN on mount and whenever the app returns to the
 * foreground: a VPN is switched on or off in another app (ADR 0011).
 */
export function useVpnRefresh(): void {
  const store = useInsightsStore();
  useEffect(() => {
    store.getState().refreshVpn();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        store.getState().refreshVpn();
      }
    });
    return () => subscription.remove();
  }, [store]);
}
