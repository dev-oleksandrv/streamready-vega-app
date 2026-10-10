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

/** auto → native → js: download mode and window only apply to the JS engine. */
function selectJsEngine() {
  fireEvent.press(screen.getByRole('button', {name: 'Engine: auto'}));
  fireEvent.press(screen.getByRole('button', {name: 'Engine: native'}));
}

const result: SpeedTestResult = {
  downloadBps: 87_400_000,
  uploadBps: 12_300_000,
  idleLatencyMs: 14,
  loadedLatencyMs: 61,
  server: {machine: 'mlab1-tst01.example', city: 'Testville', country: 'ZZ'},
  finishedAt: 0,
  uploadWindowBytes: 64 * 1024,
};

describe('DebugSpeedTestScreen', () => {
  it('runs the engine and shows live then final values', async () => {
    const {createEngine, control} = fakeEngine();
    render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    fireEvent.press(screen.getByRole('button', {name: 'Start'}));
    expect(createEngine).toHaveBeenCalledWith({
      engine: 'auto',
      downloadMode: 'arraybuffer',
      uploadWindowBytes: 32 * 1024,
    });

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
    expect(screen.getByText('64 KiB')).toBeTruthy();
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

  it('toggles the download mode before starting', () => {
    const {createEngine} = fakeEngine();
    render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    selectJsEngine();
    fireEvent.press(
      screen.getByRole('button', {name: 'Download mode: arraybuffer'}),
    );
    fireEvent.press(screen.getByRole('button', {name: 'Start'}));
    expect(createEngine).toHaveBeenCalledWith(
      expect.objectContaining({engine: 'js', downloadMode: 'blob'}),
    );
  });

  it('cycles the upload window through the options before starting', () => {
    const {createEngine} = fakeEngine();
    render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    selectJsEngine();
    const toggle = () =>
      fireEvent.press(screen.getByRole('button', {name: /^Upload window:/}));
    expect(
      screen.getByRole('button', {name: 'Upload window: 32 KiB'}),
    ).toBeTruthy();
    toggle();
    // Larger windows crashed the stick's WebSocket; the label says so.
    expect(
      screen.getByRole('button', {name: 'Upload window: 64 KiB (risky)'}),
    ).toBeTruthy();
    toggle(); // 128
    toggle(); // 256
    toggle(); // 512
    toggle(); // 1024
    toggle(); // wraps to 32
    expect(
      screen.getByRole('button', {name: 'Upload window: 32 KiB'}),
    ).toBeTruthy();
    toggle();
    fireEvent.press(screen.getByRole('button', {name: 'Start'}));
    expect(createEngine).toHaveBeenCalledWith(
      expect.objectContaining({engine: 'js', uploadWindowBytes: 64 * 1024}),
    );
  });

  it('cycles the engine and passes it to createEngine', () => {
    const {createEngine} = fakeEngine();
    render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    fireEvent.press(screen.getByRole('button', {name: 'Engine: auto'}));
    fireEvent.press(screen.getByRole('button', {name: 'Start'}));
    expect(createEngine).toHaveBeenCalledWith(
      expect.objectContaining({engine: 'native'}),
    );
    expect(screen.getByText('present')).toBeTruthy();
  });

  it('marks native as unavailable when the module is missing', () => {
    const {createEngine} = fakeEngine();
    render(
      <DebugSpeedTestScreen
        createEngine={createEngine}
        nativeAvailable={false}
      />,
    );
    fireEvent.press(screen.getByRole('button', {name: 'Engine: auto'}));
    expect(
      screen.getByRole('button', {name: 'Engine: native (unavailable)'}),
    ).toBeTruthy();
    expect(screen.getByText('missing')).toBeTruthy();
  });

  it('only lets the JS engine change download mode and window', () => {
    const {createEngine} = fakeEngine();
    render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    fireEvent.press(
      screen.getByRole('button', {name: 'Download mode: arraybuffer'}),
    );
    fireEvent.press(screen.getByRole('button', {name: /^Upload window:/}));
    expect(
      screen.getByRole('button', {name: 'Download mode: arraybuffer'}),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {name: 'Upload window: 32 KiB'}),
    ).toBeTruthy();
  });

  it('shows which engine produced the result', async () => {
    const {createEngine, control} = fakeEngine();
    render(
      <DebugSpeedTestScreen createEngine={createEngine} nativeAvailable />,
    );
    fireEvent.press(screen.getByRole('button', {name: 'Start'}));
    await act(async () =>
      control.resolve({...result, engineId: 'ndt7-native'}),
    );
    expect(screen.getByText('ndt7-native')).toBeTruthy();
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
