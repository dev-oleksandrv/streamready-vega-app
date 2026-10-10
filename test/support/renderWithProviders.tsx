import {render} from '@testing-library/react-native';
import React, {type ReactElement} from 'react';

import {AppProviders} from '~/app/providers/AppProviders';
import type {InsightsStore, NetworkMonitor} from '~/modules/insights';
import type {ConsentStore} from '~/modules/privacy';
import type {SessionStore} from '~/modules/speedtest';

import {createTestInsightsStore, FakeNetworkMonitor} from './insights';

export interface ProviderOptions {
  consentStore?: ConsentStore;
  /** Defaults to a store over fakeGeo(): never real network. */
  insightsStore?: InsightsStore;
  /** Defaults to a FakeNetworkMonitor at INITIAL_NETWORK. */
  networkMonitor?: NetworkMonitor;
  sessionStore?: SessionStore;
  onConsentAccepted?: () => Promise<void>;
}

export function renderWithProviders(
  ui: ReactElement,
  opts: ProviderOptions = {},
) {
  return render(
    <AppProviders
      consentStore={opts.consentStore}
      insightsStore={opts.insightsStore ?? createTestInsightsStore()}
      networkMonitor={opts.networkMonitor ?? new FakeNetworkMonitor()}
      sessionStore={opts.sessionStore}
      onConsentAccepted={opts.onConsentAccepted}>
      {ui}
    </AppProviders>,
  );
}
