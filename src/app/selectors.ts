import {useMemo} from 'react';

import {
  deviceProfile,
  useInsights,
  type ConnectionInfo,
  type DeviceProfile,
  type NetworkStatus,
  type VpnStatus,
} from '~/modules/insights';
import type {HistoryEntry} from '~/modules/history';
import {useConsent, type ConsentStatus} from '~/modules/privacy';
import {
  canStartTest,
  type SpeedTestResult,
  type StartCheck,
} from '~/modules/speedtest';
import {evaluate, type Verdict} from '~/modules/verdict';

/** The only way the UI reads geo insights: hidden unless consent is accepted. */
export function selectVisibleInsights(
  consent: ConsentStatus,
  connection?: ConnectionInfo,
): ConnectionInfo | undefined {
  return consent === 'accepted' ? connection : undefined;
}

export function useVisibleConnection(): ConnectionInfo | undefined {
  const consent = useConsent((s) => s.status);
  const connection = useInsights((s) => s.connection);
  return selectVisibleInsights(consent, connection);
}

/** The VPN badge is part of the insights cluster: same consent and geo gate. */
export function selectVisibleVpn(
  connection: ConnectionInfo | undefined,
  vpn: VpnStatus,
): boolean {
  return connection !== undefined && vpn === 'on';
}

export function useVisibleVpn(): boolean {
  const connection = useVisibleConnection();
  const vpn = useInsights((s) => s.vpn);
  return selectVisibleVpn(connection, vpn);
}

export interface StartInputs {
  consent: ConsentStatus;
  network: NetworkStatus;
  cooldownUntil?: number;
  now: number;
}

export function selectStartCheck({
  consent,
  network,
  cooldownUntil,
  now,
}: StartInputs): StartCheck {
  return canStartTest({consent, online: network.online, cooldownUntil, now});
}

/** A result plus the device facts the verdict needs (Wi‑Fi ceiling, transport). */
export function selectVerdict(
  result: SpeedTestResult,
  network: NetworkStatus,
  profile?: DeviceProfile,
): Verdict {
  return evaluate({
    downloadBps: result.downloadBps,
    idleLatencyMs: result.idleLatencyMs,
    loadedLatencyMs: result.loadedLatencyMs,
    deviceLimitMbps: profile?.limitMbps,
    onWifi: network.transport === 'wifi',
  });
}

export interface ResultVerdict {
  verdict: Verdict;
  /** The ceiling behind `verdict.nearDeviceLimit`, for the note's "~N Mbps". */
  deviceLimitMbps?: number;
}

/** One device-profile lookup feeds both the verdict and the limit note. */
export function useResultVerdict(
  result?: SpeedTestResult,
): ResultVerdict | undefined {
  const network = useInsights((s) => s.network);
  const model = useInsights((s) => s.device?.model);
  return useMemo(() => {
    if (!result) {
      return undefined;
    }
    const profile = deviceProfile(model);
    return {
      verdict: selectVerdict(result, network, profile),
      deviceLimitMbps: profile?.limitMbps,
    };
  }, [result, network, model]);
}

export interface HistoryInputs {
  result: SpeedTestResult;
  verdict: Verdict;
  /** Already passed through selectVisibleInsights. */
  connection?: ConnectionInfo;
  vpn: VpnStatus;
}

/** A finished test as History saves it: the values and grade the Result screen showed. */
export function selectHistoryEntry({
  result,
  verdict,
  connection,
  vpn,
}: HistoryInputs): HistoryEntry {
  const entry: HistoryEntry = {
    finishedAt: result.finishedAt,
    downloadBps: result.downloadBps,
    uploadBps: result.uploadBps,
    idleLatencyMs: result.idleLatencyMs,
    loadedLatencyMs: result.loadedLatencyMs,
    grade: verdict.grade,
    vpn,
  };
  if (connection) {
    entry.ip = connection.ip;
    entry.countryCode = connection.countryCode;
    entry.country = connection.country;
  }
  return entry;
}
