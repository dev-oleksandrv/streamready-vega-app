export type Transport = 'wifi' | 'ethernet' | 'other' | 'none';
export type WifiBand = '2.4' | '5' | '6';

export interface NetworkStatus {
  online: boolean;
  transport: Transport;
  band?: WifiBand;
}

export interface NetworkMonitor {
  current(): Promise<NetworkStatus>;
  subscribe(listener: (status: NetworkStatus) => void): () => void;
}

/** Assumed until the first reading, so Start never flashes "offline" at launch. */
export const INITIAL_NETWORK: NetworkStatus = {
  online: true,
  transport: 'other',
};

export function bandFromFrequency(mhz?: number | null): WifiBand | undefined {
  if (mhz === null || mhz === undefined || !Number.isFinite(mhz)) {
    return undefined;
  }
  if (mhz >= 2400 && mhz <= 2500) {
    return '2.4';
  }
  if (mhz >= 4900 && mhz <= 5900) {
    return '5';
  }
  if (mhz >= 5925 && mhz <= 7125) {
    return '6';
  }
  return undefined;
}

export function sameNetwork(a: NetworkStatus, b: NetworkStatus): boolean {
  return (
    a.online === b.online && a.transport === b.transport && a.band === b.band
  );
}
