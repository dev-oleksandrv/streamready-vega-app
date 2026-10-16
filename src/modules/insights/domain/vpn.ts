export type VpnStatus = 'unknown' | 'off' | 'on';

export interface VpnSource {
  /** Never throws: failures read as 'unknown'. */
  read(): VpnStatus;
}

/** Vega VpnState: 0 unknown, 1 interface down, 2 up, 3 connected, 4 recovering. */
const CONNECTED = 3;
const KNOWN_OFF: readonly number[] = [0, 1, 2, 4];

export function vpnStatusFromState(raw: number): VpnStatus {
  if (raw === CONNECTED) {
    return 'on';
  }
  // A recovering VPN carries no traffic; only CONNECTED slows the stream.
  return KNOWN_OFF.includes(raw) ? 'off' : 'unknown';
}

export const UNKNOWN_VPN: VpnSource = {read: () => 'unknown'};
