import {act, fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {
  ConsentProvider,
  PrivacyScreen,
  type ConsentStatus,
  type PrivacyMode,
} from '~/modules/privacy';
import {createTestConsentStore} from '../../../../support/consent';

const deferred = () => {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
};

async function renderScreen(
  mode: PrivacyMode,
  status: ConsentStatus,
  onConsentAccepted: () => Promise<void> = jest
    .fn()
    .mockResolvedValue(undefined),
) {
  const store = await createTestConsentStore(status);
  const onAccepted = jest.fn();
  const onBack = jest.fn();
  render(
    <ConsentProvider store={store} onConsentAccepted={onConsentAccepted}>
      <PrivacyScreen mode={mode} onAccepted={onAccepted} onBack={onBack} />
    </ConsentProvider>,
  );
  await screen.findByText(/Last updated/);
  return {store, onAccepted, onBack};
}

describe('PrivacyScreen', () => {
  beforeEach(() => {
    // Rejected consent tasks are logged by design; keep the output clean.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders all six policy sections', async () => {
    await renderScreen('view', 'accepted');
    ['01', '02', '03', '04', '05', '06'].forEach((n) =>
      expect(screen.getByText(n)).toBeTruthy(),
    );
    expect(screen.getByText('Magna aliqua')).toBeTruthy();
  });

  describe('gate', () => {
    it('shows the gate headline, prompt and only Accept', async () => {
      await renderScreen('gate', 'pending');
      expect(screen.getByText('Before you start.')).toBeTruthy();
      expect(screen.getByText(/we need your consent/)).toBeTruthy();
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('shows Accept for a withdrawn status too', async () => {
      await renderScreen('gate', 'withdrawn');
      expect(
        screen.getByRole('button', {name: 'Accept & continue'}),
      ).toBeTruthy();
    });

    it('shows a loader while the task runs, then accepts and continues', async () => {
      const task = deferred();
      const {store, onAccepted} = await renderScreen(
        'gate',
        'pending',
        () => task.promise,
      );
      fireEvent.press(screen.getByRole('button', {name: 'Accept & continue'}));
      expect(
        screen.getByTestId('spinner', {includeHiddenElements: true}),
      ).toBeTruthy();
      expect(onAccepted).not.toHaveBeenCalled();
      expect(store.getState().status).toBe('pending');
      await act(async () => task.resolve());
      expect(store.getState().status).toBe('accepted');
      expect(onAccepted).toHaveBeenCalledTimes(1);
    });

    it('runs the task once when Accept is pressed twice', async () => {
      const task = deferred();
      const run = jest.fn(() => task.promise);
      const {onAccepted} = await renderScreen('gate', 'pending', run);
      const button = screen.getByRole('button', {name: 'Accept & continue'});
      fireEvent.press(button);
      fireEvent.press(button);
      await act(async () => task.resolve());
      expect(run).toHaveBeenCalledTimes(1);
      expect(onAccepted).toHaveBeenCalledTimes(1);
    });

    it('still accepts and continues when the task rejects', async () => {
      const task = deferred();
      const {store, onAccepted} = await renderScreen(
        'gate',
        'pending',
        () => task.promise,
      );
      fireEvent.press(screen.getByRole('button', {name: 'Accept & continue'}));
      await act(async () => task.reject(new Error('geo down')));
      expect(store.getState().status).toBe('accepted');
      expect(onAccepted).toHaveBeenCalledTimes(1);
    });
  });

  describe('view', () => {
    it('shows status, Back and Withdraw when accepted', async () => {
      await renderScreen('view', 'accepted');
      expect(screen.getByText('Your data, in plain words.')).toBeTruthy();
      expect(screen.getByText('Consent given')).toBeTruthy();
      expect(screen.getByRole('button', {name: 'Back'})).toBeTruthy();
      expect(
        screen.getByRole('button', {name: 'Withdraw consent'}),
      ).toBeTruthy();
    });

    it('withdraws, then gives consent again and refreshes in the background', async () => {
      const run = jest.fn().mockResolvedValue(undefined);
      const {store} = await renderScreen('view', 'accepted', run);
      fireEvent.press(screen.getByRole('button', {name: 'Withdraw consent'}));
      expect(store.getState().status).toBe('withdrawn');
      expect(
        screen.getByText('Consent withdrawn · speed tests are off'),
      ).toBeTruthy();
      fireEvent.press(screen.getByRole('button', {name: 'Give consent'}));
      expect(store.getState().status).toBe('accepted');
      expect(screen.getByText('Consent given')).toBeTruthy();
      expect(run).toHaveBeenCalledTimes(1);
    });

    it('gives consent even if the background refresh rejects', async () => {
      const run = jest.fn().mockRejectedValue(new Error('geo down'));
      const {store} = await renderScreen('view', 'withdrawn', run);
      await act(async () => {
        fireEvent.press(screen.getByRole('button', {name: 'Give consent'}));
      });
      expect(store.getState().status).toBe('accepted');
    });

    it('calls onBack from the Back button', async () => {
      const {onBack} = await renderScreen('view', 'accepted');
      fireEvent.press(screen.getByRole('button', {name: 'Back'}));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });
});
