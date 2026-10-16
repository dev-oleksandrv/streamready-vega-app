import {
  SpeedTestError,
  type EngineEvent,
  type RunOptions,
  type SpeedTestEngine,
  type SpeedTestErrorCode,
  type SpeedTestResult,
} from '~/modules/speedtest';

export const TEST_RESULT: SpeedTestResult = {
  downloadBps: 186_400_000,
  uploadBps: 23_800_000,
  idleLatencyMs: 14,
  loadedLatencyMs: 52,
  latencySource: 'server',
  server: {machine: 'mlab1-tst01.example', city: 'Testville', country: 'ZZ'},
  finishedAt: 0,
};

/** Controls one engine.run() call. */
export interface FakeRun {
  signal: AbortSignal;
  emit: (event: EngineEvent) => void;
  resolve: (result?: SpeedTestResult) => void;
  reject: (code: SpeedTestErrorCode) => void;
}

/** Each run stays pending until the test settles it; abort rejects like a real engine. */
export function createFakeEngine() {
  const runs: FakeRun[] = [];
  const engine: SpeedTestEngine = {
    id: 'fake',
    run: ({signal, onEvent}: RunOptions) =>
      new Promise<SpeedTestResult>((resolve, reject) => {
        runs.push({
          signal,
          emit: onEvent,
          resolve: (result = TEST_RESULT) => resolve(result),
          reject: (code) => reject(new SpeedTestError(code)),
        });
        signal.addEventListener('abort', () =>
          reject(new SpeedTestError('aborted')),
        );
      }),
  };
  const createEngine = jest.fn(() => engine);
  const last = (): FakeRun => {
    const run = runs[runs.length - 1];
    if (!run) {
      throw new Error('engine.run was not called');
    }
    return run;
  };
  return {createEngine, runs, last};
}
