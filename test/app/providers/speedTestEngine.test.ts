import {
  createSpeedTestEngine,
  defaultSpeedTestEngineConfig,
  isNativeEngineAvailable,
} from '~/app/providers/speedTestEngine';
import {FallbackEngine, isSpeedTestError} from '~/modules/speedtest';
import {fakeNdt7Native} from '../../support/FakeNdt7Native';

const events = () => fakeNdt7Native().events;

describe('createSpeedTestEngine', () => {
  it('reports native availability', () => {
    expect(isNativeEngineAvailable(null)).toBe(false);
    expect(isNativeEngineAvailable(fakeNdt7Native().native)).toBe(true);
  });

  it('auto uses native with JS fallback when the module exists', () => {
    const engine = createSpeedTestEngine(
      defaultSpeedTestEngineConfig,
      fakeNdt7Native().native,
      events,
    );
    expect(engine).toBeInstanceOf(FallbackEngine);
    expect(engine.id).toBe('ndt7-native');
  });

  it('auto uses the JS engine when the module is missing', () => {
    expect(
      createSpeedTestEngine(defaultSpeedTestEngineConfig, null, events).id,
    ).toBe('ndt7');
  });

  it('js always uses the JS engine', () => {
    expect(
      createSpeedTestEngine(
        {...defaultSpeedTestEngineConfig, engine: 'js'},
        fakeNdt7Native().native,
        events,
      ).id,
    ).toBe('ndt7');
  });

  it('native uses the native engine alone', () => {
    const engine = createSpeedTestEngine(
      {...defaultSpeedTestEngineConfig, engine: 'native'},
      fakeNdt7Native().native,
      events,
    );
    expect(engine).not.toBeInstanceOf(FallbackEngine);
    expect(engine.id).toBe('ndt7-native');
  });

  it('native without the module fails with connect_failed', async () => {
    const engine = createSpeedTestEngine(
      {...defaultSpeedTestEngineConfig, engine: 'native'},
      null,
      events,
    );
    const error = await engine
      .run({signal: new AbortController().signal, onEvent: () => {}})
      .catch((e: unknown) => e);
    expect(isSpeedTestError(error) && error.code).toBe('connect_failed');
  });
});
