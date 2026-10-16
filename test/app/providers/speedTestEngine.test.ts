import {createSpeedTestEngine} from '~/app/providers/speedTestEngine';
import {isSpeedTestError, NativeNdt7Engine} from '~/modules/speedtest';
import {fakeNdt7Native} from '../../support/FakeNdt7Native';

const events = () => fakeNdt7Native().events;

describe('createSpeedTestEngine', () => {
  it('uses the native engine when the module exists', () => {
    expect(
      createSpeedTestEngine(fakeNdt7Native().native, events),
    ).toBeInstanceOf(NativeNdt7Engine);
  });

  it('fails with connect_failed when the module is missing', async () => {
    const engine = createSpeedTestEngine(null, events);
    const error = await engine
      .run({signal: new AbortController().signal, onEvent: () => {}})
      .catch((e: unknown) => e);
    expect(isSpeedTestError(error) && error.code).toBe('connect_failed');
  });

  it('asks detectTunnel once when a run starts', async () => {
    const detectTunnel = jest.fn(() => false);
    const engine = createSpeedTestEngine(
      fakeNdt7Native().native,
      events,
      detectTunnel,
    );
    const controller = new AbortController();
    const run = engine
      .run({signal: controller.signal, onEvent: () => {}})
      .catch(() => {});
    controller.abort();
    await run;
    expect(detectTunnel).toHaveBeenCalledTimes(1);
  });
});
