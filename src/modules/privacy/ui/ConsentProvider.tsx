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

export const HYDRATION_TIMEOUT_MS = 3000;

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
    const done = () => {
      if (alive) {
        setHydrated(true);
      }
    };
    // A stuck storage read must not keep the splash up forever: after the
    // timeout the app continues with `pending` and shows the consent gate.
    const timer = setTimeout(done, HYDRATION_TIMEOUT_MS);
    hydrateConsentStore(store).then(() => {
      clearTimeout(timer);
      done();
    });
    return () => {
      alive = false;
      clearTimeout(timer);
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

/** Module-internal: handlers that must read the latest state, not the rendered one. */
export function useConsentStore(): ConsentStore {
  return useConsentContext().store;
}

export function useConsentHydrated(): boolean {
  return useConsentContext().hydrated;
}

export function useOnConsentAccepted(): () => Promise<void> {
  return useConsentContext().onConsentAccepted;
}
