import {isSpeedTestError, SpeedTestError} from '../../domain/errors';
import {
  NATIVE_EVENT,
  parseNativeEvent,
  type NativeRunEvent,
} from './nativeEvents';
import type {Ndt7NativeSpec} from './NativeNdt7';

/** The subset of react-native's NativeEventEmitter the engine uses. */
export interface NativeEventSource {
  addListener(
    eventType: string,
    listener: (payload: unknown) => void,
  ): {remove(): void};
}

export type NativeDirection = 'download' | 'upload';

export interface NativeRunOptions {
  signal: AbortSignal;
  /**
   * Every progress event once. `fresh` is false for one that arrived after a
   * later event (emit() does not keep order): its measurements still count,
   * its byte counters are outdated.
   */
  onProgress: (event: NativeRunEvent, fresh: boolean) => void;
}

/**
 * Upper bound for a run with no `done`, guarding against a done event lost in
 * the native bridge. Native worst cases: download = connect 5 s + handshake
 * 7 s + 15 s + close 1 s = 28 s; upload = connect 5 s + handshake 7 s + 10 s
 * + a stalled close send 7 s + close 1 s = 30 s.
 */
export const NATIVE_WATCHDOG_MS: Readonly<Record<NativeDirection, number>> = {
  download: 33_000,
  upload: 35_000,
};

/** How long `done` waits for earlier events still in flight. */
export const NATIVE_LATE_EVENT_GRACE_MS = 250;

// Seeded from the clock so a native run that outlives a JS reload cannot be
// mistaken for a new run with the same id; kept well inside Int32.
let nextRunId = Date.now() % 1_000_000_000;

/**
 * One native subtest as a Promise. Resolves with the successful `done` event
 * (which can still carry measurements); rejects with SpeedTestError. The URL
 * is signed and never reaches errors or logs.
 */
export function runNative(
  native: Ndt7NativeSpec,
  events: NativeEventSource,
  direction: NativeDirection,
  url: string,
  {signal, onProgress}: NativeRunOptions,
): Promise<NativeRunEvent> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new SpeedTestError('aborted'));
      return;
    }
    const runId = nextRunId++;
    const seen = new Set<number>();
    let lastSeq = 0;
    let settled = false;
    let done: NativeRunEvent | undefined;
    let graceTimer: ReturnType<typeof setTimeout> | undefined;

    const subscription = events.addListener(NATIVE_EVENT, (payload) => {
      if (settled) {
        return;
      }
      let event: NativeRunEvent;
      try {
        event = parseNativeEvent(payload);
      } catch {
        fail(new SpeedTestError('protocol'));
        return;
      }
      if (event.runId !== runId || seen.has(event.seq)) {
        return;
      }
      seen.add(event.seq);
      if (event.type === 'progress') {
        const fresh = event.seq > lastSeq;
        lastSeq = Math.max(lastSeq, event.seq);
        try {
          onProgress(event, fresh);
        } catch (error) {
          fail(
            isSpeedTestError(error) ? error : new SpeedTestError('protocol'),
          );
          return;
        }
        if (done && seen.size >= done.seq) {
          succeed(done);
        }
        return;
      }
      if (event.error) {
        finish();
        reject(new SpeedTestError(event.error));
        return;
      }
      lastSeq = Math.max(lastSeq, event.seq);
      // seq counts every event of the run, so missing ones are still in flight.
      if (seen.size >= event.seq) {
        succeed(event);
        return;
      }
      done = event;
      graceTimer = setTimeout(() => succeed(event), NATIVE_LATE_EVENT_GRACE_MS);
    });
    const onAbort = () => fail(new SpeedTestError('aborted'));
    signal.addEventListener('abort', onAbort);
    const watchdog = setTimeout(
      () => fail(new SpeedTestError('timeout')),
      NATIVE_WATCHDOG_MS[direction],
    );

    try {
      native.start(runId, direction, url);
    } catch {
      // Missing method or ABI mismatch: native cannot run here.
      finish();
      reject(new SpeedTestError('connect_failed'));
    }

    function finish() {
      settled = true;
      clearTimeout(watchdog);
      if (graceTimer !== undefined) {
        clearTimeout(graceTimer);
      }
      subscription.remove();
      signal.removeEventListener('abort', onAbort);
    }

    function succeed(event: NativeRunEvent) {
      if (settled) {
        return;
      }
      finish();
      resolve(event);
    }

    /** Ends the run from the JS side; the worker must stop too. */
    function fail(error: SpeedTestError) {
      if (settled) {
        return;
      }
      finish();
      try {
        native.cancel(runId);
      } catch {
        // Nothing left to stop.
      }
      reject(error);
    }
  });
}
