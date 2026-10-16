import React, {useCallback, useEffect, useState, type ReactNode} from 'react';

import {
  createHistoryStore,
  HistoryProvider,
  hydrateHistoryStore,
  type HistoryStore,
} from '~/modules/history';
import {
  createInsightsStore,
  createNetInfoMonitor,
  createVegaDeviceSource,
  createVegaVpnSource,
  InsightsProvider,
  type InsightsStore,
  type NetworkMonitor,
} from '~/modules/insights';
import {
  ConsentProvider,
  createConsentStore,
  type ConsentStore,
} from '~/modules/privacy';
import {
  createSessionStore,
  SessionProvider,
  type SessionStore,
} from '~/modules/speedtest';
import {createMmkvStorage} from '~/shared/lib/storage';

import {COOLDOWN_MS} from '../config/app';
import {createGeoProvider} from './geoProvider';
import {connectHistoryRecorder} from './historyRecorder';
import {createSpeedTestEngine} from './speedTestEngine';

export interface AppProvidersProps {
  children: ReactNode;
  /** Test seams; production builds the real instances. */
  consentStore?: ConsentStore;
  insightsStore?: InsightsStore;
  networkMonitor?: NetworkMonitor;
  sessionStore?: SessionStore;
  /** Expected hydrated; production builds and hydrates its own. */
  historyStore?: HistoryStore;
  /** Defaults to refreshing insights. */
  onConsentAccepted?: () => Promise<void>;
}

export const AppProviders = ({
  children,
  consentStore,
  insightsStore,
  networkMonitor,
  sessionStore,
  historyStore,
  onConsentAccepted,
}: AppProvidersProps) => {
  // One MMKV instance for every persisted store (ADR 0008, ADR 0012).
  const [storage] = useState(() => createMmkvStorage());
  const [consent] = useState(() => consentStore ?? createConsentStore(storage));
  const [history] = useState(() => {
    if (historyStore) {
      return historyStore;
    }
    const store = createHistoryStore(storage);
    // MMKV reads synchronously under the async API, so this settles long
    // before the first test can finish; it never rejects.
    hydrateHistoryStore(store);
    return store;
  });
  const [insights] = useState(
    () =>
      insightsStore ??
      createInsightsStore({
        geo: createGeoProvider(),
        device: createVegaDeviceSource(),
        vpn: createVegaVpnSource(),
      }),
  );
  const [monitor] = useState(() => networkMonitor ?? createNetInfoMonitor());
  const [session] = useState(
    () =>
      sessionStore ??
      createSessionStore({
        createEngine: () =>
          createSpeedTestEngine(
            undefined,
            undefined,
            () => insights.getState().refreshVpn() === 'on',
          ),
        now: Date.now,
        cooldownMs: COOLDOWN_MS,
      }),
  );
  const refreshInsights = useCallback(
    () => insights.getState().refreshConnection(),
    [insights],
  );

  useEffect(
    () => connectHistoryRecorder({session, insights, consent, history}),
    [session, insights, consent, history],
  );

  return (
    <ConsentProvider
      store={consent}
      onConsentAccepted={onConsentAccepted ?? refreshInsights}>
      <InsightsProvider store={insights} monitor={monitor}>
        <SessionProvider store={session}>
          <HistoryProvider store={history}>{children}</HistoryProvider>
        </SessionProvider>
      </InsightsProvider>
    </ConsentProvider>
  );
};
