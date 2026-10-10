import {createStore} from 'zustand/vanilla';

import type {
  EngineEvent,
  ServerInfo,
  SpeedTestEngine,
  SpeedTestResult,
  TestPhase,
} from '../domain/engine';
import {
  isSpeedTestError,
  SpeedTestError,
  type SpeedTestErrorCode,
} from '../domain/errors';
import {errorVariant, type TestErrorVariant} from '../domain/errorVariant';
import {
  FULL_PROGRESS,
  NO_PROGRESS,
  progressForPhase,
  subtestFraction,
  type StepProgress,
} from '../domain/progress';

/** ~4 Hz: React never sees engine events directly (1 GB stick). */
export const FLUSH_INTERVAL_MS = 250;
export const MAX_BARS = 120;

export type SessionStatus = 'idle' | 'running' | 'done' | 'failed';

export interface ThroughputBar {
  direction: 'download' | 'upload';
  bps: number;
}

export interface SessionDeps {
  /** Called once per run. */
  createEngine: () => SpeedTestEngine;
  now: () => number;
  /** Starts after a successful run only. */
  cooldownMs: number;
  flushIntervalMs: number;
}

/** Live values of one run, replaced in one set() per flush. */
interface RunValues {
  phase?: TestPhase;
  server?: ServerInfo;
  /** Latest throughput of the current direction. */
  liveBps?: number;
  idleMs?: number;
  loadedMs?: number;
  progress: StepProgress;
  bars: readonly ThroughputBar[];
  /** Largest bar so far; scales the chart. */
  peakBps: number;
}

export interface SessionState extends RunValues {
  status: SessionStatus;
  result?: SpeedTestResult;
  error?: TestErrorVariant;
  cooldownUntil?: number;
  start: () => void;
  /** Silent abort: the user stopped or left. */
  stop: () => void;
  /** Ends a running test with this failure, e.g. 'network_lost' when the device goes offline. */
  fail: (code: SpeedTestErrorCode) => void;
  startCooldown: (now: number, durationMs: number) => void;
}

// Keys listed explicitly so a reset clears every live value.
const EMPTY_RUN: RunValues = {
  phase: undefined,
  server: undefined,
  liveBps: undefined,
  idleMs: undefined,
  loadedMs: undefined,
  progress: NO_PROGRESS,
  bars: [],
  peakBps: 0,
};

const unavailableEngine: SpeedTestEngine = {
  id: 'unavailable',
  run: async () => {
    throw new SpeedTestError('connect_failed');
  },
};

const DEFAULT_DEPS: SessionDeps = {
  createEngine: () => unavailableEngine,
  now: Date.now,
  cooldownMs: 30_000,
  flushIntervalMs: FLUSH_INTERVAL_MS,
};

function applyEvent(run: RunValues, event: EngineEvent): RunValues {
  switch (event.type) {
    case 'phase':
      return {
        ...run,
        phase: event.phase,
        progress: progressForPhase(run.progress, event.phase),
        // Upload starts from "—", not from the last download value.
        liveBps: event.phase === 'upload' ? undefined : run.liveBps,
      };
    case 'server':
      return {...run, server: event.server};
    case 'throughput': {
      const fraction = subtestFraction(event.elapsedMs);
      return {
        ...run,
        liveBps: event.bps,
        // Same object while unchanged, so the memoized step bars skip a render.
        progress:
          run.progress[event.direction] === fraction
            ? run.progress
            : {...run.progress, [event.direction]: fraction},
      };
    }
    case 'latency':
      return {
        ...run,
        idleMs: event.idleMs ?? run.idleMs,
        loadedMs: event.loadedMs ?? run.loadedMs,
      };
  }
}

export function createSessionStore(overrides: Partial<SessionDeps> = {}) {
  const deps: SessionDeps = {...DEFAULT_DEPS, ...overrides};

  return createStore<SessionState>()((set, get) => {
    // Bumped whenever a run ends, so late events and settles of an old run are dropped.
    let runId = 0;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let pending: RunValues = EMPTY_RUN;
    let changed = false;
    let freshSample = false;

    const onEvent = (event: EngineEvent) => {
      // A late sample of the other direction would draw a wrong bar.
      if (event.type === 'throughput' && event.direction !== pending.phase) {
        return;
      }
      pending = applyEvent(pending, event);
      changed = true;
      if (event.type === 'throughput') {
        freshSample = true;
      }
    };

    const flush = () => {
      const {phase, liveBps} = pending;
      if (
        freshSample &&
        (phase === 'download' || phase === 'upload') &&
        liveBps !== undefined &&
        pending.bars.length < MAX_BARS
      ) {
        pending = {
          ...pending,
          bars: [...pending.bars, {direction: phase, bps: liveBps}],
          peakBps: Math.max(pending.peakBps, liveBps),
        };
      }
      freshSample = false;
      if (changed) {
        changed = false;
        set(pending);
      }
    };

    /** Detaches the current run; returns its controller so the caller may abort it. */
    const endRun = () => {
      runId += 1;
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      const ended = controller;
      controller = null;
      return ended;
    };

    const finishFailed = (code: SpeedTestErrorCode) => {
      flush();
      // stop() ends our own aborts before they settle; any other 'aborted' is a failure.
      set({status: 'failed', error: errorVariant(code) ?? 'interrupted'});
    };

    return {
      ...EMPTY_RUN,
      status: 'idle',
      result: undefined,
      error: undefined,
      cooldownUntil: undefined,

      start: () => {
        if (get().status === 'running') {
          return;
        }
        endRun();
        const id = runId;
        const current = new AbortController();
        controller = current;
        pending = EMPTY_RUN;
        changed = false;
        freshSample = false;
        set({
          ...EMPTY_RUN,
          status: 'running',
          result: undefined,
          error: undefined,
        });
        timer = setInterval(flush, deps.flushIntervalMs);

        let running: Promise<SpeedTestResult>;
        try {
          running = deps.createEngine().run({
            signal: current.signal,
            onEvent: (event) => {
              if (id === runId) {
                onEvent(event);
              }
            },
          });
        } catch (error) {
          // A synchronous throw (e.g. building the engine) fails the run like a rejection.
          running = Promise.reject(error);
        }
        running.then(
          (result) => {
            if (id !== runId) {
              return;
            }
            endRun();
            flush();
            set({
              status: 'done',
              result,
              // A finished run went through every phase; the screen shows the upload result.
              phase: 'upload',
              liveBps: result.uploadBps,
              idleMs: result.idleLatencyMs,
              loadedMs: result.loadedLatencyMs,
              progress: FULL_PROGRESS,
              cooldownUntil: deps.now() + deps.cooldownMs,
            });
          },
          (error: unknown) => {
            if (id !== runId) {
              return;
            }
            endRun();
            finishFailed(isSpeedTestError(error) ? error.code : 'protocol');
          },
        );
      },

      stop: () => {
        if (get().status !== 'running') {
          return;
        }
        endRun()?.abort();
        pending = EMPTY_RUN;
        set({...EMPTY_RUN, status: 'idle'});
      },

      fail: (code) => {
        if (get().status !== 'running') {
          return;
        }
        endRun()?.abort();
        finishFailed(code);
      },

      startCooldown: (now, durationMs) => {
        set({cooldownUntil: now + durationMs});
      },
    };
  });
}

export type SessionStore = ReturnType<typeof createSessionStore>;
