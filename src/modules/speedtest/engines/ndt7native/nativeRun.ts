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
  onProgress: (event: NativeRunEvent) => void;
}

let nextRunId = 1;

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
    let lastSeq = 0;
    let settled = false;

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
      if (event.runId !== runId || event.seq <= lastSeq) {
        return;
      }
      lastSeq = event.seq;
      if (event.type === 'progress') {
        try {
          onProgress(event);
        } catch (error) {
          fail(
            isSpeedTestError(error) ? error : new SpeedTestError('protocol'),
          );
        }
        return;
      }
      finish();
      if (event.error) {
        reject(new SpeedTestError(event.error));
      } else {
        resolve(event);
      }
    });
    const onAbort = () => fail(new SpeedTestError('aborted'));
    signal.addEventListener('abort', onAbort);

    try {
      native.start(runId, direction, url);
    } catch {
      // Missing method or ABI mismatch: native cannot run here.
      finish();
      reject(new SpeedTestError('connect_failed'));
    }

    function finish() {
      settled = true;
      subscription.remove();
      signal.removeEventListener('abort', onAbort);
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
