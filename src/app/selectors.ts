import {
  useInsights,
  type ConnectionInfo,
  type NetworkStatus,
} from '~/modules/insights';
import {useConsent, type ConsentStatus} from '~/modules/privacy';
import {canStartTest, type StartCheck} from '~/modules/speedtest';

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
