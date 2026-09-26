import { create } from 'zustand/react';
import { InsightsLoader } from './InsightsLoader.ts';
import { IpInfoInsightsAdapter } from './IpInfoInsightsAdapter.ts';
import type { UserInsights } from './types.ts';
import type { InsightsProvider } from './InsightsProvider.ts';
import { envVars } from '../../config/env.ts';
import { IpInfoLiteInsightsAdapter } from './IpInfoLiteInsightsAdapter.ts';

const loader = (() => {
  const providers: InsightsProvider[] = [];

  providers.push(new IpInfoInsightsAdapter());

  if (envVars.ipInfoToken) {
    providers.push(
      new IpInfoLiteInsightsAdapter({ ipInfoLiteToken: envVars.ipInfoToken }),
    );
  }

  return new InsightsLoader(providers);
})();

type State = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: UserInsights | null;
  error: string | null;

  loadInsights: () => Promise<void>;
};

export const useInsightsStore = create<State>((set, getState) => ({
  status: 'idle',
  data: null,
  error: null,

  loadInsights: async () => {
    if (getState().status === 'loading') {
      return;
    }

    set({ status: 'loading', error: null });

    try {
      set({ status: 'success', data: await loader.loadInsights() });
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
}));
