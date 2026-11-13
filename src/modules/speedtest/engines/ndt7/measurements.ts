import type {EngineEvent} from '../../domain/engine';
import type {TcpSample} from './protocol';
import {meanAbsDelta, median} from './stats';

type LatencyEvent = Extract<EngineEvent, {type: 'latency'}>;

export const bitsPerSecond = (bytes: number, elapsedMs: number) =>
  elapsedMs > 0 ? (bytes * 8000) / elapsedMs : 0;

/**
 * Idle latency = lowest MinRTT; loaded latency = median RTT (ADR 0006). Fed by
 * the server's TCPInfo, or by the TV's own TCP_INFO under a VPN (ADR 0011).
 */
export class DownloadLatency {
  private minRtt: number | undefined;
  private readonly rtts: number[] = [];
  private readonly timed: {rttMs: number; atMs: number; seq: number}[] = [];
  private emittedIdle: number | undefined;
  private emittedLoaded: number | undefined;

  /** `atMs` is when the sample was taken; defaults to the server's own ElapsedTime. */
  add(sample: TcpSample, atMs?: number): void {
    if (sample.minRttMs !== undefined) {
      this.minRtt =
        this.minRtt === undefined
          ? sample.minRttMs
          : Math.min(this.minRtt, sample.minRttMs);
    }
    if (sample.rttMs !== undefined) {
      this.rtts.push(sample.rttMs);
      const at = atMs ?? sample.elapsedMs;
      if (at !== undefined) {
        this.timed.push({
          rttMs: sample.rttMs,
          atMs: at,
          seq: this.timed.length,
        });
      }
    }
  }

  /** Mean change between consecutive RTTs in time order (ties: arrival order). */
  jitterMs(): number | undefined {
    const ordered = [...this.timed].sort(
      (a, b) => a.atMs - b.atMs || a.seq - b.seq,
    );
    return meanAbsDelta(ordered.map((s) => s.rttMs));
  }

  get idleMs(): number | undefined {
    return this.minRtt;
  }

  loadedMs(): number | undefined {
    return this.rtts.length > 0 ? median(this.rtts) : undefined;
  }

  /** The latency event to emit, or undefined when nothing changed since the last one. */
  nextEvent(): LatencyEvent | undefined {
    const loaded = this.loadedMs();
    if (this.minRtt === this.emittedIdle && loaded === this.emittedLoaded) {
      return undefined;
    }
    this.emittedIdle = this.minRtt;
    this.emittedLoaded = loaded;
    return {type: 'latency', idleMs: this.minRtt, loadedMs: loaded};
  }
}

/** Upload throughput as the server measured it: BytesReceived / ElapsedTime. */
export class UploadRate {
  private bps: number | undefined;
  private bytes = 0;
  private elapsedMs = 0;

  /**
   * Returns the new rate when the sample carries one. Native events can
   * arrive out of order, so a sample older than the last one is ignored.
   */
  add(sample: TcpSample): number | undefined {
    if (
      sample.bytesReceived === undefined ||
      sample.elapsedMs === undefined ||
      sample.elapsedMs <= 0 ||
      sample.elapsedMs < this.elapsedMs
    ) {
      return undefined;
    }
    this.elapsedMs = sample.elapsedMs;
    this.bytes = sample.bytesReceived;
    this.bps = (sample.bytesReceived * 8000) / sample.elapsedMs;
    return this.bps;
  }

  get lastBps(): number | undefined {
    return this.bps;
  }

  get serverBytes(): number {
    return this.bytes;
  }
}
