import React, {useCallback, useState, type ReactNode} from 'react';

import {
  createInsightsStore,
  createNetInfoMonitor,
  createVegaDeviceSource,
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
import {createSpeedTestEngine} from './speedTestEngine';

export interface AppProvidersProps {
  children: ReactNode;
  /** Test seams; production builds the real instances. */
  consentStore?: ConsentStore;
  insightsStore?: InsightsStore;
  networkMonitor?: NetworkMonitor;
  sessionStore?: SessionStore;
  /** Defaults to refreshing insights. */
  onConsentAccepted?: () => Promise<void>;
}

export const AppProviders = ({
  children,
  consentStore,
  insightsStore,
  networkMonitor,
  sessionStore,
  onConsentAccepted,
}: AppProvidersProps) => {
  const [consent] = useState(
    () => consentStore ?? createConsentStore(createMmkvStorage()),
  );
  const [insights] = useState(
    () =>
      insightsStore ??
      createInsightsStore({
        geo: createGeoProvider(),
        device: createVegaDeviceSource(),
      }),
  );
  const [monitor] = useState(() => networkMonitor ?? createNetInfoMonitor());
  const [session] = useState(
    () =>
      sessionStore ??
      createSessionStore({
        createEngine: () => createSpeedTestEngine(),
        now: Date.now,
        cooldownMs: COOLDOWN_MS,
      }),
  );
  const refreshInsights = useCallback(
    () => insights.getState().refreshConnection(),
    [insights],
  );

  return (
    <ConsentProvider
      store={consent}
      onConsentAccepted={onConsentAccepted ?? refreshInsights}>
      <InsightsProvider store={insights} monitor={monitor}>
        <SessionProvider store={session}>{children}</SessionProvider>
      </InsightsProvider>
    </ConsentProvider>
  );
};
