import React, {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';
import {useStore} from 'zustand';

import type {NetworkMonitor} from '../domain/network';
import type {InsightsState, InsightsStore} from '../store/insightsStore';

const InsightsContext = createContext<InsightsStore | null>(null);

export interface InsightsProviderProps {
  store: InsightsStore;
  monitor: NetworkMonitor;
  children: ReactNode;
}

/** Starts device-local reads only (allowed before consent); geo lookups are triggered by the app. */
export const InsightsProvider = ({
  store,
  monitor,
  children,
}: InsightsProviderProps) => {
  useEffect(() => {
    let heardEvent = false;
    store.getState().loadDevice();
    const unsubscribe = monitor.subscribe((status) => {
      heardEvent = true;
      store.getState().setNetwork(status);
    });
    monitor.current().then((status) => {
      // An event is newer than the initial reading; don't let the reading overwrite it.
      if (!heardEvent) {
        store.getState().setNetwork(status);
      }
    });
    return unsubscribe;
  }, [store, monitor]);

  return (
    <InsightsContext.Provider value={store}>
      {children}
    </InsightsContext.Provider>
  );
};

export function useInsightsStore(): InsightsStore {
  const store = useContext(InsightsContext);
  if (!store) {
    throw new Error('InsightsProvider is missing');
  }
  return store;
}

export function useInsights<T>(selector: (state: InsightsState) => T): T {
  return useStore(useInsightsStore(), selector);
}
