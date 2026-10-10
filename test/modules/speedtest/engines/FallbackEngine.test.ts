import {
  FallbackEngine,
  isSpeedTestError,
  SpeedTestError,
  type EngineEvent,
  type RunOptions,
  type SpeedTestEngine,
  type SpeedTestErrorCode,
  type SpeedTestResult,
} from '~/modules/speedtest';
import {silentLogger} from '../../../support/fixtures/ndt7';

const result = (engineId: string): SpeedTestResult => ({
  downloadBps: 1,
  uploadBps: 1,
  idleLatencyMs: 1,
  loadedLatencyMs: 1,
  server: {machine: 'mlab1.example'},
  finishedAt: 0,
  engineId,
});

function engine(
  id: string,
  behaviour: (onEvent: (e: EngineEvent) => void) => Promise<SpeedTestResult>,
): SpeedTestEngine & {run: jest.Mock} {
  return {id, run: jest.fn(({onEvent}: RunOptions) => behaviour(onEvent))};
}

const failing =
  (code: SpeedTestErrorCode, afterDownloadData = false) =>
  async (onEvent: (e: EngineEvent) => void): Promise<SpeedTestResult> => {
    if (afterDownloadData) {
      onEvent({
        type: 'throughput',
        direction: 'download',
        bps: 1,
        elapsedMs: 1,
      });
    }
    throw new SpeedTestError(code);
  };

describe('FallbackEngine', () => {
  it('returns the primary result without touching the fallback', async () => {
    const primary = engine('native', async () => result('native'));
    const fallback = engine('js', async () => result('js'));
    const composite = new FallbackEngine(primary, fallback, silentLogger);
    await expect(
      composite.run({
        signal: new AbortController().signal,
        onEvent: () => {},
      }),
    ).resolves.toMatchObject({engineId: 'native'});
    expect(fallback.run).not.toHaveBeenCalled();
    expect(composite.id).toBe('native');
  });

  it.each<[string, SpeedTestErrorCode, boolean, boolean]>([
    ['connect_failed before data', 'connect_failed', false, true],
    ['no_servers before data', 'no_servers', false, true],
    ['connect_failed after download data', 'connect_failed', true, false],
    ['network_lost', 'network_lost', false, false],
    ['timeout', 'timeout', false, false],
    ['protocol', 'protocol', false, false],
    ['locate_failed', 'locate_failed', false, false],
    ['aborted', 'aborted', false, false],
  ])('%s: falls back = %s', async (_label, code, afterData, fallsBack) => {
    const primary = engine('native', failing(code, afterData));
    const fallback = engine('js', async () => result('js'));
    const outcome = await new FallbackEngine(primary, fallback, silentLogger)
      .run({signal: new AbortController().signal, onEvent: () => {}})
      .catch((e: unknown) => e);
    if (fallsBack) {
      expect(outcome).toMatchObject({engineId: 'js'});
    } else {
      expect(isSpeedTestError(outcome) && outcome.code).toBe(code);
      expect(fallback.run).not.toHaveBeenCalled();
    }
  });

  it('never falls back once the signal is aborted', async () => {
    const controller = new AbortController();
    const primary = engine('native', async () => {
      controller.abort();
      throw new SpeedTestError('connect_failed');
    });
    const fallback = engine('js', async () => result('js'));
    const outcome = await new FallbackEngine(primary, fallback, silentLogger)
      .run({signal: controller.signal, onEvent: () => {}})
      .catch((e: unknown) => e);
    expect(isSpeedTestError(outcome)).toBe(true);
    expect(fallback.run).not.toHaveBeenCalled();
  });

  it('forwards events from both engines', async () => {
    const primary = engine('native', async (onEvent) => {
      onEvent({type: 'phase', phase: 'locating'});
      throw new SpeedTestError('connect_failed');
    });
    const fallback = engine('js', async (onEvent) => {
      onEvent({type: 'phase', phase: 'locating'});
      return result('js');
    });
    const events: EngineEvent[] = [];
    await new FallbackEngine(primary, fallback, silentLogger).run({
      signal: new AbortController().signal,
      onEvent: (e) => events.push(e),
    });
    expect(events).toHaveLength(2);
  });
});
