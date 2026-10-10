import React, {createContext, useContext, type ReactNode} from 'react';
import {useStore} from 'zustand';

import type {SessionState, SessionStore} from '../store/sessionStore';

const SessionContext = createContext<SessionStore | null>(null);

export interface SessionProviderProps {
  store: SessionStore;
  children: ReactNode;
}

export const SessionProvider = ({store, children}: SessionProviderProps) => (
  <SessionContext.Provider value={store}>{children}</SessionContext.Provider>
);

export function useSessionStore(): SessionStore {
  const store = useContext(SessionContext);
  if (!store) {
    throw new Error('SessionProvider is missing');
  }
  return store;
}

export function useSession<T>(selector: (state: SessionState) => T): T {
  return useStore(useSessionStore(), selector);
}
