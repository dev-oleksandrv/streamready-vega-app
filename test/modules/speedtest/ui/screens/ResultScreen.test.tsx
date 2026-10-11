import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {
  ResultScreen,
  type ResultScreenProps,
  type SpeedTestResult,
} from '~/modules/speedtest';
import {evaluate} from '~/modules/verdict';
import {colors} from '~/shared/ui';
import {flatStyle} from '../../../../support/style';

const finishedAt = new Date(2026, 9, 11, 20, 41).getTime();

function resultFor(dlMbps: number, idle = 14, loaded = 52): SpeedTestResult {
  return {
    downloadBps: dlMbps * 1e6,
    uploadBps: 23_800_000,
    idleLatencyMs: idle,
    loadedLatencyMs: loaded,
    server: {machine: 'mlab1-tst01.example', city: 'Frankfurt', country: 'DE'},
    finishedAt,
  };
}

function setup(
  overrides: Partial<ResultScreenProps> = {},
  result = resultFor(186.4),
) {
  const props: ResultScreenProps = {
    result,
    verdict: evaluate({...result, deviceLimitMbps: 300, onWifi: true}),
    deviceLimitMbps: 300,
    now: finishedAt,
    startCheck: {ok: true},
    cooldownSeconds: 0,
    onTestAgain: jest.fn(),
    onBack: jest.fn(),
    onOpenLatency: jest.fn(),
    ...overrides,
  };
  render(<ResultScreen {...props} />);
  return props;
}

describe('ResultScreen', () => {
  it('shows the verdict, checks and numbers', () => {
    setup();
    expect(
      screen.getByText('RESULT · TODAY, 8:41 PM · FRANKFURT SERVER'),
    ).toBeTruthy();
    expect(flatStyle(screen.getByText('Ready for 4K.')).color).toBe(
      colors.lime,
    );
    expect(
      screen.getByText(
        'Two 4K streams at once, no buffering expected. Your connection is in great shape.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Two 4K TVs at once')).toBeTruthy();
    expect(screen.getByText('Needs 50 Mbps')).toBeTruthy();
    expect(screen.getAllByTestId('check-passed')).toHaveLength(4);
    expect(screen.getByText('186')).toBeTruthy();
    expect(screen.getByText('23.8')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getByText('ms idle')).toBeTruthy();
    expect(flatStyle(screen.getByText('B')).color).toBe(colors.lime);
    expect(screen.getByText('52 ms loaded')).toBeTruthy();
  });

  it('shows the device-limit note when near the limit', () => {
    setup();
    expect(
      screen.getByText("Near your stick's Wi‑Fi limit (~300 Mbps)"),
    ).toBeTruthy();
  });

  it('hides the note below the limit', () => {
    setup({}, resultFor(38.2, 18, 61));
    expect(screen.queryByText(/Near your stick/)).toBeNull();
    expect(screen.getAllByTestId('check-failed')).toHaveLength(1);
  });

  it('laggy: amber headline, coral grade', () => {
    setup({}, resultFor(142, 16, 420));
    expect(flatStyle(screen.getByText('Fast, but laggy.')).color).toBe(
      colors.amber,
    );
    expect(flatStyle(screen.getByText('F')).color).toBe(colors.coral);
  });

  it('buttons call their handlers', () => {
    const props = setup();
    fireEvent.press(screen.getByRole('button', {name: 'Test again'}));
    fireEvent.press(screen.getByRole('button', {name: 'Back'}));
    fireEvent.press(screen.getByRole('button', {name: 'Why it lags'}));
    expect(props.onTestAgain).toHaveBeenCalledTimes(1);
    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect(props.onOpenLatency).toHaveBeenCalledTimes(1);
  });

  it('cooldown shows the countdown and ignores presses', () => {
    const props = setup({
      startCheck: {ok: false, reason: 'cooldown'},
      cooldownSeconds: 27,
    });
    fireEvent.press(screen.getByRole('button', {name: 'Test again in 27s'}));
    expect(props.onTestAgain).not.toHaveBeenCalled();
  });

  test.each(['offline', 'consent'] as const)(
    'blocked Test again (%s) ignores presses',
    (reason) => {
      const props = setup({startCheck: {ok: false, reason}});
      const button = screen.getByRole('button', {name: 'Test again'});
      expect(button).toBeDisabled();
      fireEvent.press(button);
      expect(props.onTestAgain).not.toHaveBeenCalled();
    },
  );
});
