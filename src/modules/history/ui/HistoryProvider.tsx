import React, {createContext, useContext, type ReactNode} from 'react';
import {useStore} from 'zustand';

import type {HistoryState, HistoryStore} from '../store/historyStore';

const HistoryContext = createContext<HistoryStore | null>(null);

export interface HistoryProviderProps {
  store: HistoryStore;
  children: ReactNode;
}

export const HistoryProvider = ({store, children}: HistoryProviderProps) => (
  <HistoryContext.Provider value={store}>{children}</HistoryContext.Provider>
);

export function useHistoryStore(): HistoryStore {
  const store = useContext(HistoryContext);
  if (!store) {
    throw new Error('HistoryProvider is missing');
  }
  return store;
}

export function useHistory<T>(selector: (state: HistoryState) => T): T {
  return useStore(useHistoryStore(), selector);
}
