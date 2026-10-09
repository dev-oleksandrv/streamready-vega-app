import {createLogger, type Logger} from '~/shared/lib/logger';

import type {
  EngineEvent,
  RunOptions,
  SpeedTestEngine,
  SpeedTestResult,
  TestPhase,
} from '../../domain/engine';
import {isSpeedTestError, SpeedTestError} from '../../domain/errors';
import {runDownload} from './download';
import {locate, type Ndt7Target} from './locate';
import {CONNECT_TIMEOUT_MS, MAX_SERVER_ATTEMPTS} from './protocol';
import {
  openSocket,
  type BinaryMode,
  type CreateSocket,
  type Ndt7Socket,
} from './socket';
import {runUpload} from './upload';

export type DownloadMode = BinaryMode;

export interface Ndt7EngineDeps {
  createSocket: CreateSocket;
  fetch: typeof fetch;
  now: () => number;
  clientVersion: string;
  downloadMode?: DownloadMode;
  logger?: Logger;
}

export class Ndt7Engine implements SpeedTestEngine {
  readonly id = 'ndt7';
  private running = false;
  private readonly log: Logger;

  constructor(private readonly deps: Ndt7EngineDeps) {
    this.log = deps.logger ?? createLogger('speedtest:ndt7');
  }

  async run({signal, onEvent}: RunOptions): Promise<SpeedTestResult> {
    if (this.running) {
      throw new Error('run already in progress');
    }
    this.running = true;
    try {
      const result = await this.measure(signal, onEvent);
      this.log.info('result', {
        downloadBps: result.downloadBps,
        uploadBps: result.uploadBps,
        idleLatencyMs: result.idleLatencyMs,
        loadedLatencyMs: result.loadedLatencyMs,
      });
      return result;
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
    const {createSocket, fetch: fetchFn, now, clientVersion} = this.deps;
    const enter = (phase: TestPhase) => {
      this.log.info('phase', phase);
      onEvent({type: 'phase', phase});
    };

    enter('locating');
    const targets = await locate({fetch: fetchFn, clientVersion, signal});

    enter('latency');
    const {target, socket} = await this.connect(targets, signal);
    this.log.info('server', target.server.machine);
    onEvent({type: 'server', server: target.server});

    enter('download');
    const download = await runDownload(socket, {now, signal, onEvent});

    enter('upload');
    const uploadSocket = await openSocket(createSocket, target.uploadUrl, {
      binaryType: 'arraybuffer',
      timeoutMs: CONNECT_TIMEOUT_MS,
      signal,
    });
    const upload = await runUpload(uploadSocket, {now, signal, onEvent});

    return {
      downloadBps: download.bps,
      uploadBps: upload.bps,
      idleLatencyMs: download.idleLatencyMs,
      loadedLatencyMs: download.loadedLatencyMs,
      server: target.server,
      finishedAt: now(),
    };
  }

  /** Tries up to MAX_SERVER_ATTEMPTS servers in Locate order. */
  private async connect(
    targets: readonly Ndt7Target[],
    signal: AbortSignal,
  ): Promise<{target: Ndt7Target; socket: Ndt7Socket}> {
    const binaryType = this.deps.downloadMode ?? 'arraybuffer';
    for (const target of targets.slice(0, MAX_SERVER_ATTEMPTS)) {
      try {
        const socket = await openSocket(
          this.deps.createSocket,
          target.downloadUrl,
          {binaryType, timeoutMs: CONNECT_TIMEOUT_MS, signal},
        );
        return {target, socket};
      } catch (error) {
        if (!isSpeedTestError(error) || error.code !== 'connect_failed') {
          throw error;
        }
        this.log.warn('connect failed', target.server.machine);
      }
    }
    throw new SpeedTestError('connect_failed');
  }
}
