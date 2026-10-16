export type TestPhase = 'locating' | 'latency' | 'download' | 'upload';

/** Public description of a test server. Never holds URLs: they carry access tokens. */
export interface ServerInfo {
  machine: string;
  city?: string;
  country?: string;
}

export type EngineEvent =
  | {type: 'phase'; phase: TestPhase}
  | {type: 'server'; server: ServerInfo}
  | {
      type: 'throughput';
      direction: 'download' | 'upload';
      bps: number;
      elapsedMs: number;
    }
  | {type: 'latency'; idleMs?: number; loadedMs?: number};

export interface SpeedTestResult {
  downloadBps: number;
  uploadBps: number;
  idleLatencyMs: number;
  loadedLatencyMs: number;
  /** 'device' when a VPN was connected: the server then measures the VPN exit, not the TV (ADR 0011). */
  latencySource: 'server' | 'device';
  server: ServerInfo;
  finishedAt: number;
}

export interface RunOptions {
  signal: AbortSignal;
  onEvent: (event: EngineEvent) => void;
}

export interface SpeedTestEngine {
  readonly id: string;
  run(opts: RunOptions): Promise<SpeedTestResult>;
}
