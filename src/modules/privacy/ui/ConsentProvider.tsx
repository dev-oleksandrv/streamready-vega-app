import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {useStore} from 'zustand';

import {
  hydrateConsentStore,
  type ConsentState,
  type ConsentStore,
} from '../store/consentStore';

interface ConsentContextValue {
  store: ConsentStore;
  hydrated: boolean;
  onConsentAccepted: () => Promise<void>;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export interface ConsentProviderProps {
  store: ConsentStore;
  /** Runs on Accept before navigating on (insights fetch, wired by the app). */
  onConsentAccepted: () => Promise<void>;
  children: ReactNode;
}

export const ConsentProvider = ({
  store,
  onConsentAccepted,
  children,
}: ConsentProviderProps) => {
  // Kept outside the zustand store so marking hydration never triggers a persist write.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    hydrateConsentStore(store).then(() => {
      if (alive) {
        setHydrated(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [store]);

  const value = useMemo(
    () => ({store, hydrated, onConsentAccepted}),
    [store, hydrated, onConsentAccepted],
  );
  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
};

function useConsentContext(): ConsentContextValue {
  const value = useContext(ConsentContext);
  if (!value) {
    throw new Error('ConsentProvider is missing');
  }
  return value;
}

export function useConsent<T>(selector: (state: ConsentState) => T): T {
  return useStore(useConsentContext().store, selector);
}

export function useConsentHydrated(): boolean {
  return useConsentContext().hydrated;
}

export function useOnConsentAccepted(): () => Promise<void> {
  return useConsentContext().onConsentAccepted;
}
