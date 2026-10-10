import {act, fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {
  createSessionStore,
  SessionProvider,
  TestScreen,
  type SessionStore,
} from '~/modules/speedtest';
import {emitAppState} from '../../../../support/fakeAppState';
import {pressBack as firePlatformBack} from '../../../../support/fakeBackHandler';
import {createFakeEngine} from '../../../../support/fakeEngine';

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = firePlatformBack();
  });
  return handled;
}

const settle = () => act(async () => {});
const tick = () => act(() => jest.advanceTimersByTime(250));

function setup(online = true) {
  const fake = createFakeEngine();
  const store: SessionStore = createSessionStore({
    createEngine: fake.createEngine,
    now: () => 0,
    cooldownMs: 30_000,
  });
  const onExit = jest.fn();
  const view = (isOnline: boolean) => (
    <SessionProvider store={store}>
      <TestScreen online={isOnline} onExit={onExit} />
    </SessionProvider>
  );
  const utils = render(view(online));
  const setOnline = (isOnline: boolean) => utils.rerender(view(isOnline));
  return {fake, store, onExit, setOnline, unmount: utils.unmount};
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  act(() => emitAppState('active'));
  jest.useRealTimers();
});

describe('TestScreen', () => {
  it('starts a run on mount and shows the search state', () => {
    const {fake} = setup();
    expect(fake.createEngine).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Finding server')).toBeTruthy();
    expect(screen.getByText('Finding nearest server…')).toBeTruthy();
    expect(screen.getByText('Latency under load')).toBeTruthy();
    expect(screen.getByText('Idle ping')).toBeTruthy();
  });

  it('shows live phase, value, latency and server at 4 Hz', () => {
    const {fake} = setup();
    const run = fake.last();
    act(() => {
      run.emit({type: 'phase', phase: 'latency'});
      run.emit({
        type: 'server',
        server: {machine: 'm', city: 'Frankfurt', country: 'DE'},
      });
      run.emit({type: 'phase', phase: 'download'});
      run.emit({
        type: 'throughput',
        direction: 'download',
        bps: 87_400_000,
        elapsedMs: 2_000,
      });
      run.emit({type: 'latency', idleMs: 14, loadedMs: 52});
    });
    expect(screen.queryByText('87.4')).toBeNull();
    tick();
    expect(screen.getByText('87.4')).toBeTruthy();
    expect(screen.getByText('Frankfurt, DE · M‑Lab')).toBeTruthy();
    expect(screen.getByText('14 ms')).toBeTruthy();
    expect(screen.getByText('52 ms')).toBeTruthy();
    expect(screen.getAllByTestId('throughput-bar')).toHaveLength(1);
  });

  it('Back while running opens the Stop dialog; Keep testing resumes', () => {
    const {fake, onExit} = setup();
    expect(pressBack()).toBe(true);
    expect(screen.getByText('Stop the test?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {name: 'Keep testing'}));
    expect(screen.queryByText('Stop the test?')).toBeNull();
    expect(fake.last().signal.aborted).toBe(false);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('Back inside the Stop dialog resumes', () => {
    setup();
    pressBack();
    expect(pressBack()).toBe(true);
    expect(screen.queryByText('Stop the test?')).toBeNull();
  });

  it('Stop test aborts silently and exits', async () => {
    const {fake, store, onExit} = setup();
    pressBack();
    fireEvent.press(screen.getByRole('button', {name: 'Stop test'}));
    expect(fake.last().signal.aborted).toBe(true);
    expect(onExit).toHaveBeenCalledTimes(1);
    await settle();
    expect(store.getState().error).toBeUndefined();
  });

  it('success freezes on Finished; Back exits; cooldown is set', async () => {
    const {fake, store, onExit} = setup();
    fake.last().resolve();
    await settle();
    expect(screen.getByText('Finished')).toBeTruthy();
    expect(screen.getByText('23.8')).toBeTruthy();
    expect(store.getState().cooldownUntil).toBe(30_000);
    expect(pressBack()).toBe(true);
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Stop the test?')).toBeNull();
  });

  it('a run that finishes behind the Stop dialog keeps the dialog; Keep testing shows the result', async () => {
    const {fake, store, onExit} = setup();
    pressBack();
    fake.last().resolve();
    await settle();
    expect(screen.getByText('Stop the test?')).toBeTruthy();
    expect(store.getState().cooldownUntil).toBe(30_000);
    fireEvent.press(screen.getByRole('button', {name: 'Keep testing'}));
    expect(screen.getByText('Finished')).toBeTruthy();
    expect(onExit).not.toHaveBeenCalled();
  });

  it.each([
    ['network_lost', 'Connection lost.'],
    ['no_servers', 'Test servers are busy.'],
    ['timeout', "The test didn't finish."],
  ] as const)('%s shows its overlay; Back goes home', async (code, title) => {
    const {fake, onExit} = setup();
    fake.last().reject(code);
    await settle();
    expect(screen.getByText(title)).toBeTruthy();
    expect(pressBack()).toBe(true);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('an error replaces the Stop dialog', async () => {
    const {fake} = setup();
    pressBack();
    fake.last().reject('protocol');
    await settle();
    expect(screen.queryByText('Stop the test?')).toBeNull();
    expect(screen.getByText("The test didn't finish.")).toBeTruthy();
  });

  it('Try again starts a fresh run', async () => {
    const {fake} = setup();
    fake.last().reject('timeout');
    await settle();
    fireEvent.press(screen.getByRole('button', {name: 'Try again'}));
    expect(fake.createEngine).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("The test didn't finish.")).toBeNull();
    expect(screen.getByText('Finding server')).toBeTruthy();
  });

  it('Back to home exits', async () => {
    const {fake, onExit} = setup();
    fake.last().reject('timeout');
    await settle();
    fireEvent.press(screen.getByRole('button', {name: 'Back to home'}));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('going offline mid-test shows connection lost and waits for the network', () => {
    const {fake, setOnline} = setup();
    setOnline(false);
    expect(fake.last().signal.aborted).toBe(true);
    expect(screen.getByText('Connection lost.')).toBeTruthy();
    expect(screen.getByText('Waiting for connection…')).toBeTruthy();
    setOnline(true);
    expect(screen.queryByText('Waiting for connection…')).toBeNull();
    fireEvent.press(screen.getByRole('button', {name: 'Try again'}));
    expect(fake.createEngine).toHaveBeenCalledTimes(2);
  });

  it('mounted while offline fails at once with connection lost', () => {
    setup(false);
    expect(screen.getByText('Connection lost.')).toBeTruthy();
    const retry = screen.getByRole('button', {name: 'Try again'});
    expect(retry.props.accessibilityState.disabled).toBe(true);
  });

  it('going offline behind the Stop dialog shows the error instead', () => {
    const {setOnline, onExit} = setup();
    pressBack();
    setOnline(false);
    expect(screen.queryByText('Stop the test?')).toBeNull();
    expect(screen.getByText('Connection lost.')).toBeTruthy();
    pressBack();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('background mid-test aborts silently and exits', () => {
    const {fake, store, onExit} = setup();
    act(() => emitAppState('background'));
    expect(fake.last().signal.aborted).toBe(true);
    expect(store.getState().status).toBe('idle');
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('inactive (system overlay) does not abort', () => {
    const {fake, onExit} = setup();
    act(() => emitAppState('inactive'));
    expect(fake.last().signal.aborted).toBe(false);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('background after the run finished stays put', async () => {
    const {fake, onExit} = setup();
    fake.last().resolve();
    await settle();
    act(() => emitAppState('background'));
    expect(onExit).not.toHaveBeenCalled();
    expect(screen.getByText('Finished')).toBeTruthy();
  });

  it('unmount stops a running test', () => {
    const {fake, unmount} = setup();
    unmount();
    expect(fake.last().signal.aborted).toBe(true);
  });
});
