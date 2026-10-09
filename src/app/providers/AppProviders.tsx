import React, {useState, type ReactNode} from 'react';

import {
  ConsentProvider,
  createConsentStore,
  type ConsentStore,
} from '~/modules/privacy';
import {createAsyncStorage} from '~/shared/lib/storage';

export interface AppProvidersProps {
  children: ReactNode;
  /** Test seam; production builds the persisted store. */
  consentStore?: ConsentStore;
  onConsentAccepted?: () => Promise<void>;
}

// Module 1 has nothing to fetch on Accept; the insights module plugs in here.
const noopConsentTask = async () => {};

export const AppProviders = ({
  children,
  consentStore,
  onConsentAccepted = noopConsentTask,
}: AppProvidersProps) => {
  const [store] = useState(
    () => consentStore ?? createConsentStore(createAsyncStorage()),
  );
  return (
    <ConsentProvider store={store} onConsentAccepted={onConsentAccepted}>
      {children}
    </ConsentProvider>
  );
};
