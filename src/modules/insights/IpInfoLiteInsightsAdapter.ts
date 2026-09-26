import type { InsightsProvider } from './InsightsProvider.ts';
import type { UserInsights } from './types.ts';

type IpInfoLiteResponse = {
  ip: string;
};

type IpInfoLiteInsightsAdapterOptions = {
  ipInfoLiteToken: string;
};

export class IpInfoLiteInsightsAdapter implements InsightsProvider {
  readonly name = 'ipinfo-lite';

  constructor(private readonly options: IpInfoLiteInsightsAdapterOptions) {}

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
    const { ipInfoLiteToken } = this.options;

    return `https://api.ipinfo.io/lite/me?token=${encodeURIComponent(
      ipInfoLiteToken,
    )}`;
  }

  private toDomain(r: IpInfoLiteResponse): UserInsights {
    // todo: add validation
    return {
      ip: r.ip,
    };
  }
}
