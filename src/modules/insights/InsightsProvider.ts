import type { UserInsights } from './types.ts';

export interface InsightsProvider {
  readonly name: string;

  fetchInsights(signal?: AbortSignal): Promise<UserInsights>;
}
