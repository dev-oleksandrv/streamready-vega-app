import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {RootNavigator} from '~/app/navigation/RootNavigator';
import {createConsentStore, type ConsentStatus} from '~/modules/privacy';
import {createMemoryStorage, type KeyValueStorage} from '~/shared/lib/storage';
import {createTestConsentStore} from '../../support/consent';
import {pressBack as firePlatformBack} from '../../support/fakeBackHandler';
import {
  createTestInsightsStore,
  fakeGeo,
  TEST_CONNECTION,
} from '../../support/insights';
import {
  renderWithProviders,
  type ProviderOptions,
} from '../../support/renderWithProviders';
import type {ConnectionInfo} from '~/modules/insights';

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
