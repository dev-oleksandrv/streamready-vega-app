import type {NativeEventSource, Ndt7NativeSpec} from '~/modules/speedtest';

type Listener = (payload: unknown) => void;

interface EventFields {
  bytes?: number;
  elapsedMs?: number;
  measurements?: string[];
  error?: string;
}

/** Scriptable stand-in for the Ndt7Native Turbo Module and its event emitter. */
export function fakeNdt7Native() {
  const listeners = new Set<Listener>();
  const started: {runId: number; direction: string; url: string}[] = [];
  const cancelled: number[] = [];
  const seqs = new Map<number, number>();
  let startError: Error | undefined;

  const native = {
    start: jest.fn((runId: number, direction: string, url: string) => {
      if (startError) {
        throw startError;
      }
      started.push({runId, direction, url});
    }),
    cancel: jest.fn((runId: number) => {
      cancelled.push(runId);
    }),
  } as unknown as Ndt7NativeSpec;

  const events: NativeEventSource = {
    addListener: (_eventType, listener) => {
      listeners.add(listener);
      return {remove: () => listeners.delete(listener)};
    },
  };

  const emitRaw = (payload: unknown) =>
    [...listeners].forEach((listener) => listener(payload));

  const send = (
    runId: number,
    type: 'progress' | 'done',
    fields: EventFields = {},
  ) => {
    const seq = (seqs.get(runId) ?? 0) + 1;
    seqs.set(runId, seq);
    emitRaw({
      runId,
      seq,
      type,
      bytes: fields.bytes ?? 0,
      elapsedMs: fields.elapsedMs ?? 0,
      measurements: fields.measurements ?? [],
      ...(fields.error === undefined ? {} : {error: fields.error}),
    });
  };

  return {
    native,
    events,
    started,
    cancelled,
    emitRaw,
    progress: (runId: number, fields?: EventFields) =>
      send(runId, 'progress', fields),
    done: (runId: number, fields?: EventFields) => send(runId, 'done', fields),
    failStartWith: (error: Error) => {
      startError = error;
    },
    listenerCount: () => listeners.size,
  };
}
