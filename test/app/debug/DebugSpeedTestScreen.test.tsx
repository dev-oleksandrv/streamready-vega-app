import {act, fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {DebugSpeedTestScreen} from '~/app/debug/DebugSpeedTestScreen';
import {
  SpeedTestError,
  type EngineEvent,
  type RunOptions,
  type SpeedTestEngine,
  type SpeedTestResult,
} from '~/modules/speedtest';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function fakeEngine() {
  const control: {
    emit: (e: EngineEvent) => void;
    resolve: (r: SpeedTestResult) => void;
    reject: (e: unknown) => void;
    signal?: AbortSignal;
  } = {emit: () => {}, resolve: () => {}, reject: () => {}};
  const engine: SpeedTestEngine = {
    id: 'fake',
    run: jest.fn(
      ({signal, onEvent}: RunOptions) =>
        new Promise<SpeedTestResult>((resolve, reject) => {
          control.emit = onEvent;
          control.resolve = resolve;
          control.reject = reject;
          control.signal = signal;
          signal.addEventListener('abort', () =>
            reject(new SpeedTestError('aborted')),
          );
        }),
    ),
  };
  const createEngine = jest.fn(() => engine);
  return {createEngine, control};
}

const result: SpeedTestResult = {
  downloadBps: 87_400_000,
  uploadBps: 12_300_000,
  idleLatencyMs: 14,
  loadedLatencyMs: 61,
  server: {machine: 'mlab1-tst01.example', city: 'Testville', country: 'ZZ'},
  finishedAt: 0,
};

describe('DebugSpeedTestScreen', () => {
  it('runs the engine and shows live then final values', async () => {
    const {createEngine, control} = fakeEngine();
    render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    fireEvent.press(screen.getByRole('button', {name: 'Start'}));
    expect(createEngine).toHaveBeenCalledTimes(1);

    act(() => {
      control.emit({type: 'phase', phase: 'download'});
      control.emit({
        type: 'throughput',
        direction: 'download',
        bps: 25e6,
        elapsedMs: 250,
      });
      jest.advanceTimersByTime(250);
    });
    expect(screen.getByText('download')).toBeTruthy();
    expect(screen.getByText('25.0 Mbps')).toBeTruthy();

    await act(async () => control.resolve(result));
    expect(screen.getByText('done')).toBeTruthy();
    expect(screen.getByText('87.4 Mbps')).toBeTruthy();
    expect(screen.getByText('12.3 Mbps')).toBeTruthy();
    expect(screen.getByText('14 ms')).toBeTruthy();
    expect(screen.getByText('61 ms')).toBeTruthy();
    expect(
      screen.getByText('mlab1-tst01.example · Testville, ZZ'),
    ).toBeTruthy();
  });

  it('measures JS thread stalls per phase', () => {
    const {createEngine, control} = fakeEngine();
    render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    fireEvent.press(screen.getByRole('button', {name: 'Start'}));
    act(() => {
      control.emit({type: 'phase', phase: 'download'});
      jest.advanceTimersByTime(100);
      // The JS thread is blocked for 400 ms: the next probe fires that late.
      jest.setSystemTime(Date.now() + 400);
      jest.advanceTimersByTime(100);
      jest.advanceTimersByTime(250);
    });
    expect(screen.getByText(/^max 400 ms · avg \d+ ms$/)).toBeTruthy();
  });

  it('measures an idle baseline stall while no test runs', () => {
    const {createEngine} = fakeEngine();
    render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    act(() => {
      jest.advanceTimersByTime(100);
      // The JS thread is blocked for 300 ms with no test running.
      jest.setSystemTime(Date.now() + 300);
      jest.advanceTimersByTime(100);
      jest.advanceTimersByTime(250);
    });
    expect(screen.getByText('JS stall (idle)')).toBeTruthy();
    expect(screen.getByText(/^max 300 ms · avg \d+ ms$/)).toBeTruthy();
    expect(createEngine).not.toHaveBeenCalled();
  });

  it('shows the raw error code on failure', async () => {
    const {createEngine, control} = fakeEngine();
    render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    fireEvent.press(screen.getByRole('button', {name: 'Start'}));
    await act(async () => control.reject(new SpeedTestError('no_servers')));
    expect(screen.getByText('failed')).toBeTruthy();
    expect(screen.getByText('no_servers')).toBeTruthy();
  });

  it('stops a running test', async () => {
    const {createEngine, control} = fakeEngine();
    render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    fireEvent.press(screen.getByRole('button', {name: 'Start'}));
    await act(async () => {
      fireEvent.press(screen.getByRole('button', {name: 'Stop'}));
    });
    expect(control.signal?.aborted).toBe(true);
    expect(screen.getByText('aborted')).toBeTruthy();
  });

  it('shows whether the native module loaded', () => {
    const {createEngine} = fakeEngine();
    const view = render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    expect(screen.getByText('present')).toBeTruthy();
    view.rerender(
      <DebugSpeedTestScreen
        createEngine={createEngine}
        nativeAvailable={false}
      />,
    );
    expect(screen.getByText('missing')).toBeTruthy();
  });

  it('offers only Start and Stop', () => {
    const {createEngine} = fakeEngine();
    render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    expect(
      screen.getAllByRole('button').map((b) => b.props.accessibilityLabel),
    ).toEqual(['Start', 'Stop']);
  });

  it('aborts and stops updating when unmounted mid-run', async () => {
    const {createEngine, control} = fakeEngine();
    const view = render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    fireEvent.press(screen.getByRole('button', {name: 'Start'}));
    view.unmount();
    expect(control.signal?.aborted).toBe(true);
    // Plain microtask flushes: act() would schedule timers of its own.
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
    }
    expect(jest.getTimerCount()).toBe(0);
  });
});
