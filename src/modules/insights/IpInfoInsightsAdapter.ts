import type { InsightsProvider } from './InsightsProvider.ts';
import type { UserInsights } from './types.ts';

type IpInfoResponse = {
  ip: string;
};

export class IpInfoInsightsAdapter implements InsightsProvider {
  readonly name = 'ipinfo-free';

  async fetchInsights(signal?: AbortSignal): Promise<UserInsights> {
    const endpointUrl = this.buildUrl();
    const response = await fetch(endpointUrl, { signal });

    if (!response.ok) {
      throw new Error(
        `${this.name}: HTTP ${response.status} ${response.statusText}`,
      );
    }

    return this.toDomain(await response.json());
  }

  private buildUrl(): string {
    return `https://ipinfo.io/json`;
  }

  private toDomain(r: IpInfoResponse): UserInsights {
    // todo: add validation
    return {
      ip: r.ip,
    };
  }
}
