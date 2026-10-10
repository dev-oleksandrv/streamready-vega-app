import type {EngineEvent, ServerInfo, TestPhase} from '~/modules/speedtest';

export interface DebugSnapshot {
  phase?: TestPhase;
  server?: ServerInfo;
  downloadBps?: number;
  uploadBps?: number;
  idleMs?: number;
  loadedMs?: number;
}

export function applyEngineEvent(
  snapshot: DebugSnapshot,
  event: EngineEvent,
): DebugSnapshot {
  switch (event.type) {
    case 'phase':
      return {...snapshot, phase: event.phase};
    case 'server':
      return {...snapshot, server: event.server};
    case 'throughput':
      return event.direction === 'download'
        ? {...snapshot, downloadBps: event.bps}
        : {...snapshot, uploadBps: event.bps};
    case 'latency':
      return {
        ...snapshot,
        idleMs: event.idleMs ?? snapshot.idleMs,
        loadedMs: event.loadedMs ?? snapshot.loadedMs,
      };
  }
}
