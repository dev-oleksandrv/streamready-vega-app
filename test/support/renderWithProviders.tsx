import {render} from '@testing-library/react-native';
import React, {type ReactElement} from 'react';

import {AppProviders} from '~/app/providers/AppProviders';
import type {ConsentStore} from '~/modules/privacy';

export interface ProviderOptions {
  consentStore?: ConsentStore;
  onConsentAccepted?: () => Promise<void>;
}

export function renderWithProviders(
  ui: ReactElement,
  opts: ProviderOptions = {},
) {
  return render(
    <AppProviders
      consentStore={opts.consentStore}
      onConsentAccepted={opts.onConsentAccepted}>
      {ui}
    </AppProviders>,
  );
}
