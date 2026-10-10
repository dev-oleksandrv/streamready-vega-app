import {createLogger, type Logger} from '~/shared/lib/logger';

import type {
  EngineEvent,
  RunOptions,
  SpeedTestEngine,
  SpeedTestResult,
  TestPhase,
} from '../../domain/engine';
import {isSpeedTestError, SpeedTestError} from '../../domain/errors';
import {locate, type Ndt7Target} from '../ndt7/locate';
import {bitsPerSecond, DownloadLatency, UploadRate} from '../ndt7/measurements';
import {MAX_SERVER_ATTEMPTS, parseMeasurement} from '../ndt7/protocol';
import type {NativeRunEvent} from './nativeEvents';
import type {Ndt7NativeSpec} from './NativeNdt7';
import {runNative, type NativeEventSource} from './nativeRun';

export const NATIVE_NDT7_ENGINE_ID = 'ndt7-native';

export interface NativeNdt7EngineDeps {
  native: Ndt7NativeSpec;
  events: NativeEventSource;
  fetch: typeof fetch;
  now: () => number;
  clientVersion: string;
  logger?: Logger;
}

type PlainTarget = Ndt7Target & {
  plainDownloadUrl: string;
  plainUploadUrl: string;
};

const hasPlainUrls = (target: Ndt7Target): target is PlainTarget =>
  target.plainDownloadUrl !== undefined && target.plainUploadUrl !== undefined;

interface DownloadOutcome {
  target: PlainTarget;
  bps: number;
  idleLatencyMs: number;
  loadedLatencyMs: number;
}

/**
 * ndt7 over the Ndt7Native Turbo Module (ADR 0006). Locate and all result
 * logic stay in TypeScript; native code moves bytes and forwards measurements.
 */
export class NativeNdt7Engine implements SpeedTestEngine {
  readonly id = NATIVE_NDT7_ENGINE_ID;
  private running = false;
  private readonly log: Logger;

  constructor(private readonly deps: NativeNdt7EngineDeps) {
    this.log = deps.logger ?? createLogger('speedtest:ndt7-native');
  }

  async run({signal, onEvent}: RunOptions): Promise<SpeedTestResult> {
    if (this.running) {
      throw new Error('run already in progress');
    }
    this.running = true;
    try {
      return await this.measure(signal, onEvent);
    } catch (error) {
      const failure = isSpeedTestError(error)
        ? error
        : new SpeedTestError(signal.aborted ? 'aborted' : 'protocol');
      this.log.warn('failed', failure.code);
      throw failure;
    } finally {
      this.running = false;
    }
  }

  private async measure(
    signal: AbortSignal,
    onEvent: (event: EngineEvent) => void,
  ): Promise<SpeedTestResult> {
    const {fetch: fetchFn, now, clientVersion} = this.deps;
    const enter = (phase: TestPhase) => {
      this.log.info('phase', phase);
      onEvent({type: 'phase', phase});
    };

    enter('locating');
    const targets = (await locate({fetch: fetchFn, clientVersion, signal}))
      .filter(hasPlainUrls)
      .slice(0, MAX_SERVER_ATTEMPTS);
    if (targets.length === 0) {
      throw new SpeedTestError('no_servers');
    }

    enter('latency');
    const download = await this.download(targets, signal, onEvent, enter);

    enter('upload');
    const uploadBps = await this.upload(download.target, signal, onEvent);

    return {
      downloadBps: download.bps,
      uploadBps,
      idleLatencyMs: download.idleLatencyMs,
      loadedLatencyMs: download.loadedLatencyMs,
      server: download.target.server,
      finishedAt: now(),
      engineId: NATIVE_NDT7_ENGINE_ID,
    };
  }

  /** Tries targets in Locate order until one connects; then that one is the test. */
  private async download(
    targets: readonly PlainTarget[],
    signal: AbortSignal,
    onEvent: (event: EngineEvent) => void,
    enter: (phase: TestPhase) => void,
  ): Promise<DownloadOutcome> {
    for (const target of targets) {
      const latency = new DownloadLatency();
      let connected = false;
      const connect = () => {
        if (!connected) {
          connected = true;
          this.log.info('server', target.server.machine);
          onEvent({type: 'server', server: target.server});
          enter('download');
        }
      };
      const absorb = (event: NativeRunEvent) =>
        event.measurements.forEach((text) =>
          latency.add(parseMeasurement(text)),
        );
      try {
        const done = await runNative(
          this.deps.native,
          this.deps.events,
          'download',
          target.plainDownloadUrl,
          {
            signal,
            onProgress: (event, fresh) => {
              connect();
              absorb(event);
              if (fresh && event.elapsedMs > 0) {
                onEvent({
                  type: 'throughput',
                  direction: 'download',
                  bps: bitsPerSecond(event.bytes, event.elapsedMs),
                  elapsedMs: event.elapsedMs,
                });
              }
              const latencyEvent = latency.nextEvent();
              if (latencyEvent) {
                onEvent(latencyEvent);
              }
            },
          },
        );
        connect();
        absorb(done);
        const idleLatencyMs = latency.idleMs;
        if (idleLatencyMs === undefined) {
          throw new SpeedTestError('protocol');
        }
        this.log.info('download', {
          bytes: done.bytes,
          elapsedMs: done.elapsedMs,
        });
        return {
          target,
          bps: bitsPerSecond(done.bytes, done.elapsedMs),
          idleLatencyMs,
          loadedLatencyMs: latency.loadedMs() ?? idleLatencyMs,
        };
      } catch (error) {
        if (
          connected ||
          !isSpeedTestError(error) ||
          error.code !== 'connect_failed'
        ) {
          throw error;
        }
        this.log.warn('connect failed', target.server.machine);
      }
    }
    throw new SpeedTestError('connect_failed');
  }

  private async upload(
    target: PlainTarget,
    signal: AbortSignal,
    onEvent: (event: EngineEvent) => void,
  ): Promise<number> {
    const rate = new UploadRate();
    const absorb = (event: NativeRunEvent) => {
      for (const text of event.measurements) {
        const bps = rate.add(parseMeasurement(text));
        if (bps !== undefined) {
          onEvent({
            type: 'throughput',
            direction: 'upload',
            bps,
            elapsedMs: event.elapsedMs,
          });
        }
      }
    };
    const done = await runNative(
      this.deps.native,
      this.deps.events,
      'upload',
      target.plainUploadUrl,
      {signal, onProgress: absorb},
    );
    absorb(done);
    const bps = rate.lastBps;
    if (bps === undefined) {
      throw new SpeedTestError('protocol');
    }
    this.log.info('upload', {bytes: done.bytes, elapsedMs: done.elapsedMs});
    return bps;
  }
}
