import {formatMbps, formatMs} from '~/shared/lib/format';

import {testContent as copy} from '../content';
import type {ServerInfo, TestPhase} from '../domain/engine';
import type {SessionStatus} from '../store/sessionStore';

export interface LiveLabelInputs {
  status: SessionStatus;
  phase?: TestPhase;
  uploadProgress: number;
}

export function liveLabel({
  status,
  phase,
  uploadProgress,
}: LiveLabelInputs): string {
  if (status === 'done') {
    return copy.live.done;
  }
  switch (phase) {
    case undefined:
    case 'locating':
      return copy.live.locating;
    case 'latency':
      return copy.live.latency;
    case 'download':
      return copy.live.download;
    case 'upload':
      // Upload sent its 10 s; the engine is collecting the final measurements.
      return status === 'running' && uploadProgress >= 1
        ? copy.live.finishing
        : copy.live.upload;
  }
}

export function liveUnit(phase?: TestPhase): string {
  return phase === 'latency' ? copy.units.ms : copy.units.mbps;
}

/** Ping has no live value: idle latency arrives with the download measurements. */
export function liveValue(
  phase: TestPhase | undefined,
  liveBps?: number,
): string {
  return (phase === 'download' || phase === 'upload') && liveBps !== undefined
    ? formatMbps(liveBps)
    : copy.empty;
}

export function latencyText(ms?: number): string {
  return ms === undefined ? copy.empty : copy.ms(formatMs(ms));
}

export function serverName(server: ServerInfo): string {
  const place = [server.city, server.country].filter(Boolean).join(', ');
  return place ? `${place} · ${copy.server.provider}` : server.machine;
}
