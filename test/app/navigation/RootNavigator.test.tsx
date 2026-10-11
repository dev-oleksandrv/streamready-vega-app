import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {RootNavigator} from '~/app/navigation/RootNavigator';
import {createConsentStore, type ConsentStatus} from '~/modules/privacy';
import {createMemoryStorage, type KeyValueStorage} from '~/shared/lib/storage';
import {createTestConsentStore} from '../../support/consent';
import {pressBack as firePlatformBack} from '../../support/fakeBackHandler';
import {createSessionStore} from '~/modules/speedtest';
import {
  createTestInsightsStore,
  fakeGeo,
  FakeNetworkMonitor,
  TEST_CONNECTION,
} from '../../support/insights';
import {
  renderWithProviders,
  type ProviderOptions,
} from '../../support/renderWithProviders';
import type {ConnectionInfo} from '~/modules/insights';
import {createFakeEngine} from '../../support/fakeEngine';
import {emitAppState} from '../../support/fakeAppState';

/** Fires the hardware Back key; true when the app handled it. */
function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = firePlatformBack();
  });
  return handled;
}

async function start(
  status: ConsentStatus,
  onConsentAccepted?: () => Promise<void>,
  insightsStore = createTestInsightsStore(),
  extra: Partial<ProviderOptions> = {},
) {
  const consentStore = await createTestConsentStore(status);
  renderWithProviders(<RootNavigator />, {
    consentStore,
    onConsentAccepted,
    insightsStore,
    ...extra,
  });
  return {consentStore, onConsentAccepted, insightsStore};
}

describe('cold start', () => {
  it('shows the splash until consent is loaded', async () => {
    let release!: (v: string | null) => void;
    const storage: KeyValueStorage = {
      ...createMemoryStorage(),
      getItem: () => new Promise((resolve) => (release = resolve)),
    };
    renderWithProviders(<RootNavigator />, {
      consentStore: createConsentStore(storage),
    });
    expect(screen.getByTestId('splash')).toBeTruthy();
    await act(async () => release(null));
    expect(await screen.findByText('Before you start.')).toBeTruthy();
    expect(screen.queryByTestId('splash')).toBeNull();
  });

  it('pending → privacy gate', async () => {
    await start('pending');
    expect(await screen.findByText('Before you start.')).toBeTruthy();
  });

  it('withdrawn → privacy gate', async () => {
    await start('withdrawn');
    expect(
      await screen.findByRole('button', {name: 'Accept & continue'}),
    ).toBeTruthy();
  });

  it('accepted → home', async () => {
    await start('accepted');
    expect(await screen.findByText('Will your TV stream in 4K?')).toBeTruthy();
  });

  it('accepted: keeps the splash until insights settle, then shows home', async () => {
    let resolveGeo!: (c: ConnectionInfo) => void;
    const geo = fakeGeo();
    geo.lookup.mockImplementation(
      () => new Promise((resolve) => (resolveGeo = resolve)),
    );
    await start('accepted', undefined, createTestInsightsStore({geo}));
    await act(async () => {});
    expect(screen.getByTestId('splash')).toBeTruthy();
    await act(async () => resolveGeo(TEST_CONNECTION));
    expect(await screen.findByText('Will your TV stream in 4K?')).toBeTruthy();
    expect(geo.lookup).toHaveBeenCalledTimes(1);
  });

  it('accepted: a failed lookup still shows home', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await start(
      'accepted',
      undefined,
      createTestInsightsStore({geo: fakeGeo(new Error('down'))}),
    );
    expect(await screen.findByText('Will your TV stream in 4K?')).toBeTruthy();
    jest.restoreAllMocks();
  });

  it('pending: no lookup at cold start', async () => {
    const geo = fakeGeo();
    await start('pending', undefined, createTestInsightsStore({geo}));
    await screen.findByText('Before you start.');
    expect(geo.lookup).not.toHaveBeenCalled();
  });

  it('shows the global header', async () => {
    await start('accepted');
    expect(await screen.findByText('Internet Speed Test')).toBeTruthy();
  });
});

describe('consent flow', () => {
  it('accept runs the task, then lands on home', async () => {
    const onConsentAccepted = jest.fn().mockResolvedValue(undefined);
    const {consentStore} = await start('pending', onConsentAccepted);
    fireEvent.press(
      await screen.findByRole('button', {name: 'Accept & continue'}),
    );
    expect(await screen.findByText('Will your TV stream in 4K?')).toBeTruthy();
    expect(onConsentAccepted).toHaveBeenCalledTimes(1);
    expect(consentStore.getState().status).toBe('accepted');
  });

  it('accept refreshes insights by default', async () => {
    const geo = fakeGeo();
    const {insightsStore} = await start(
      'pending',
      undefined,
      createTestInsightsStore({geo}),
    );
    fireEvent.press(
      await screen.findByRole('button', {name: 'Accept & continue'}),
    );
    await screen.findByText('Will your TV stream in 4K?');
    expect(geo.lookup).toHaveBeenCalledTimes(1);
    expect(insightsStore.getState().connection).toEqual(TEST_CONNECTION);
  });

  it('accept lands on home even when the task rejects', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await start('pending', jest.fn().mockRejectedValue(new Error('geo down')));
    fireEvent.press(
      await screen.findByRole('button', {name: 'Accept & continue'}),
    );
    expect(await screen.findByText('Will your TV stream in 4K?')).toBeTruthy();
    jest.restoreAllMocks();
  });

  it('home → privacy view → withdraw → back to home', async () => {
    const {consentStore} = await start('accepted');
    fireEvent.press(
      await screen.findByRole('button', {name: 'Privacy Policy'}),
    );
    expect(await screen.findByText('Your data, in plain words.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {name: 'Withdraw consent'}));
    expect(consentStore.getState().status).toBe('withdrawn');
    fireEvent.press(screen.getByRole('button', {name: 'Back'}));
    expect(await screen.findByText('Will your TV stream in 4K?')).toBeTruthy();
  });
});

describe('back key', () => {
  it('pops privacy view back to home', async () => {
    await start('accepted');
    fireEvent.press(
      await screen.findByRole('button', {name: 'Privacy Policy'}),
    );
    await screen.findByText('Your data, in plain words.');
    expect(pressBack()).toBe(true);
    expect(await screen.findByText('Will your TV stream in 4K?')).toBeTruthy();
  });

  it('falls through to the system on the gate', async () => {
    await start('pending');
    await screen.findByText('Before you start.');
    expect(pressBack()).toBe(false);
  });

  it('falls through to the system on home', async () => {
    await start('accepted');
    await screen.findByText('Will your TV stream in 4K?');
    expect(pressBack()).toBe(false);
  });

  it('falls through on home reached from the gate (no gate left in history)', async () => {
    await start('pending');
    fireEvent.press(
      await screen.findByRole('button', {name: 'Accept & continue'}),
    );
    await screen.findByText('Will your TV stream in 4K?');
    expect(pressBack()).toBe(false);
  });
});

describe('start', () => {
  afterEach(() => jest.useRealTimers());

  it('withdrawn consent shows the consent hint', async () => {
    const {consentStore} = await start('accepted');
    await screen.findByText('Press OK');
    act(() => consentStore.getState().withdraw());
    expect(await screen.findByText('Privacy consent withdrawn')).toBeTruthy();
  });

  it('offline shows the offline hint', async () => {
    const networkMonitor = new FakeNetworkMonitor();
    await start('accepted', undefined, undefined, {networkMonitor});
    await screen.findByText('Press OK');
    act(() => networkMonitor.emit({online: false, transport: 'none'}));
    expect(await screen.findByText('You are offline')).toBeTruthy();
  });

  it('cooldown counts down to ready', async () => {
    jest.useFakeTimers({doNotFake: ['nextTick', 'setImmediate']});
    const sessionStore = createSessionStore();
    sessionStore.getState().startCooldown(Date.now(), 3000);
    await start('accepted', undefined, undefined, {sessionStore});
    expect(await screen.findByText('0:03')).toBeTruthy();
    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByText('0:02')).toBeTruthy();
    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByText('Press OK')).toBeTruthy();
  });

  it('a cooldown far in the future (clock went back) does not block Start', async () => {
    const sessionStore = createSessionStore();
    sessionStore.getState().startCooldown(Date.now(), 3_600_000);
    await start('accepted', undefined, undefined, {sessionStore});
    expect(await screen.findByText('Press OK')).toBeTruthy();
  });
});

describe('test screen', () => {
  function sessionWithFake() {
    const fake = createFakeEngine();
    const sessionStore = createSessionStore({
      createEngine: fake.createEngine,
      cooldownMs: 30_000,
    });
    return {fake, sessionStore};
  }

  async function openTest() {
    const {fake, sessionStore} = sessionWithFake();
    const networkMonitor = new FakeNetworkMonitor();
    await start('accepted', undefined, undefined, {
      sessionStore,
      networkMonitor,
    });
    fireEvent.press(await screen.findByRole('button', {name: 'Start'}));
    expect(await screen.findByText('Finding nearest server…')).toBeTruthy();
    return {fake, sessionStore, networkMonitor};
  }

  afterEach(() => act(() => emitAppState('active')));

  it('Start opens the test and runs the engine', async () => {
    const {fake} = await openTest();
    expect(fake.createEngine).toHaveBeenCalledTimes(1);
  });

  it('Back → Stop test returns home with the cooldown', async () => {
    await openTest();
    expect(pressBack()).toBe(true);
    fireEvent.press(screen.getByRole('button', {name: 'Stop test'}));
    expect(await screen.findByText('0:30')).toBeTruthy();
  });

  it('a finished test opens the result; Back shows the home cooldown', async () => {
    const {fake} = await openTest();
    await act(async () => fake.last().resolve());
    expect(await screen.findByText('Ready for 4K.')).toBeTruthy();
    expect(
      screen.getByRole('button', {name: 'Test again in 30s'}),
    ).toBeTruthy();
    expect(pressBack()).toBe(true);
    expect(await screen.findByText('0:30')).toBeTruthy();
  });

  it('going to the background aborts and returns home with the cooldown', async () => {
    const {fake} = await openTest();
    act(() => emitAppState('background'));
    expect(fake.last().signal.aborted).toBe(true);
    expect(await screen.findByText('0:30')).toBeTruthy();
  });

  it('going offline shows connection lost; Back to home returns home', async () => {
    const {networkMonitor} = await openTest();
    act(() => networkMonitor.emit({online: false, transport: 'none'}));
    expect(await screen.findByText('Connection lost.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {name: 'Back to home'}));
    expect(await screen.findByText('You are offline')).toBeTruthy();
  });
});

describe('result and latency', () => {
  async function finishTest(cooldownMs = 30_000) {
    const fake = createFakeEngine();
    const sessionStore = createSessionStore({
      createEngine: fake.createEngine,
      cooldownMs,
    });
    await start('accepted', undefined, undefined, {sessionStore});
    fireEvent.press(await screen.findByRole('button', {name: 'Start'}));
    await screen.findByText('Finding nearest server…');
    await act(async () => fake.last().resolve());
    await screen.findByText('Ready for 4K.');
    return {fake, sessionStore};
  }

  afterEach(() => act(() => emitAppState('active')));

  it('Why it lags opens latency; Back returns to the result', async () => {
    await finishTest();
    fireEvent.press(screen.getByRole('button', {name: 'Why it lags'}));
    expect(
      await screen.findByText('Grade B. Smooth, even when busy.'),
    ).toBeTruthy();
    expect(pressBack()).toBe(true);
    expect(await screen.findByText('Ready for 4K.')).toBeTruthy();
  });

  it('Back to result returns to the result', async () => {
    await finishTest();
    fireEvent.press(screen.getByRole('button', {name: 'Why it lags'}));
    fireEvent.press(
      await screen.findByRole('button', {name: 'Back to result'}),
    );
    expect(await screen.findByText('Ready for 4K.')).toBeTruthy();
  });

  it('Back button goes home with the cooldown', async () => {
    await finishTest();
    fireEvent.press(screen.getByRole('button', {name: 'Back'}));
    expect(await screen.findByText('0:30')).toBeTruthy();
  });

  it('Test again runs a new test once the cooldown is over', async () => {
    const {fake} = await finishTest(0);
    fireEvent.press(screen.getByRole('button', {name: 'Test again'}));
    expect(await screen.findByText('Finding nearest server…')).toBeTruthy();
    expect(fake.createEngine).toHaveBeenCalledTimes(2);
  });

  it('a missing result leaves for home', async () => {
    const {sessionStore} = await finishTest(0);
    // Lost state: a new run clears the result while Result is shown.
    act(() => sessionStore.getState().start());
    expect(await screen.findByText('Will your TV stream in 4K?')).toBeTruthy();
    // No Test screen owns that run; end it so its flush timer stops.
    act(() => sessionStore.getState().stop());
  });
});

describe('device screen', () => {
  it('opens from home, shows geo, and Back returns home', async () => {
    await start('accepted');
    fireEvent.press(
      await screen.findByRole('button', {name: 'Device & connection'}),
    );
    expect(await screen.findByText("You're on Vega OS.")).toBeTruthy();
    expect(screen.getByText('Public IP')).toBeTruthy();
    expect(pressBack()).toBe(true);
    expect(await screen.findByText('Will your TV stream in 4K?')).toBeTruthy();
  });

  it('withdraw hides geo on Device', async () => {
    const {consentStore} = await start('accepted');
    await screen.findByText('Will your TV stream in 4K?');
    act(() => consentStore.getState().withdraw());
    fireEvent.press(screen.getByRole('button', {name: 'Device & connection'}));
    await screen.findByText("You're on Vega OS.");
    expect(screen.queryByText('Public IP')).toBeNull();
    expect(screen.queryByText('203.0.113.7')).toBeNull();
  });

  it('Back button returns home', async () => {
    await start('accepted');
    fireEvent.press(
      await screen.findByRole('button', {name: 'Device & connection'}),
    );
    fireEvent.press(await screen.findByRole('button', {name: 'Back'}));
    expect(await screen.findByText('Will your TV stream in 4K?')).toBeTruthy();
  });
});
