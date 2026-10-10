export interface ConnectionInfo {
  ip: string;
  /** Upper-case ISO 3166-1 alpha-2. */
  countryCode: string;
  /** English name; falls back to the code. */
  country: string;
  city?: string;
  isp?: string;
}

export interface GeoIpProvider {
  readonly id: string;
  lookup(signal: AbortSignal): Promise<ConnectionInfo>;
}
