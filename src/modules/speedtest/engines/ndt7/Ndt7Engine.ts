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
import {
  CONNECT_TIMEOUT_MS,
  DEFAULT_UPLOAD_WINDOW_BYTES,
  MAX_SERVER_ATTEMPTS,
  UPLOAD_WINDOW_OPTIONS,
} from './protocol';
import {
  openSocket,
  type BinaryMode,
  type CreateSocket,
  type Ndt7Socket,
} from './socket';
import {runUpload, type UploadOutcome} from './upload';

export type DownloadMode = BinaryMode;

export interface Ndt7EngineDeps {
  createSocket: CreateSocket;
  fetch: typeof fetch;
  now: () => number;
  clientVersion: string;
  downloadMode?: DownloadMode;
  /** First upload window to try; smaller ones from UPLOAD_WINDOW_OPTIONS follow on failure. */
  uploadWindowBytes?: number;
  logger?: Logger;
}

/** The chosen window, then every smaller option, largest first. */
function uploadWindowLadder(first: number): number[] {
  const smaller = UPLOAD_WINDOW_OPTIONS.filter((w) => w < first);
  return [first, ...[...smaller].reverse()];
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
    const {fetch: fetchFn, now, clientVersion} = this.deps;
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
    const upload = await this.upload(target, signal, onEvent);

    return {
      downloadBps: download.bps,
      uploadBps: upload.bps,
      idleLatencyMs: download.idleLatencyMs,
      loadedLatencyMs: download.loadedLatencyMs,
      server: target.server,
      finishedAt: now(),
      uploadWindowBytes: upload.windowBytes,
    };
  }

  /**
   * Vega fails a backed-up socket instead of buffering, so a lost upload is
   * retried on a fresh socket with a smaller window. A retry that cannot even
   * connect is a real outage and ends the run.
   */
  private async upload(
    target: Ndt7Target,
    signal: AbortSignal,
    onEvent: (event: EngineEvent) => void,
  ): Promise<UploadOutcome & {windowBytes: number}> {
    const {createSocket, now} = this.deps;
    const ladder = uploadWindowLadder(
      this.deps.uploadWindowBytes ?? DEFAULT_UPLOAD_WINDOW_BYTES,
    );
    for (const [attempt, windowBytes] of ladder.entries()) {
      const socket = await openSocket(createSocket, target.uploadUrl, {
        binaryType: 'arraybuffer',
        timeoutMs: CONNECT_TIMEOUT_MS,
        signal,
      });
      try {
        const outcome = await runUpload(socket, {
          now,
          signal,
          onEvent,
          windowBytes,
        });
        return {...outcome, windowBytes};
      } catch (error) {
        const isLast = attempt === ladder.length - 1;
        if (
          isLast ||
          !isSpeedTestError(error) ||
          error.code !== 'network_lost'
        ) {
          throw error;
        }
        this.log.warn('upload retry', {
          failedWindowBytes: windowBytes,
          nextWindowBytes: ladder[attempt + 1],
        });
      }
    }
    // The ladder always has at least the chosen window.
    throw new SpeedTestError('protocol');
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
