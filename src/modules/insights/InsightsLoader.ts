import type { InsightsProvider } from './InsightsProvider.ts';
import type { UserInsights } from './types.ts';

type InsightsLoaderOptions = {
  timeoutMs: number;
};

export class InsightsLoader {
  private readonly options: InsightsLoaderOptions;

  private readonly defaultOptions: InsightsLoaderOptions = {
    timeoutMs: 5_000,
  };

  constructor(
    private readonly providers: InsightsProvider[],
    externalOptions: Partial<InsightsLoaderOptions> = {},
  ) {
    this.options = {
      timeoutMs: externalOptions.timeoutMs ?? this.defaultOptions.timeoutMs,
    };
  }

  // todo: receive external signal to abort request
  async loadInsights(): Promise<UserInsights> {
    if (!this.providers.length) {
      throw new Error('insightsLoader: at least one provider should exist');
    }

    let error: unknown;

    const { timeoutMs } = this.options;

    for (const provider of this.providers) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);

      try {
        return await provider.fetchInsights(ctrl.signal);
      } catch (err) {
        error = err;
      } finally {
        clearTimeout(timer);
      }
    }

    throw error;
  }
}
