import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {LatencyScreen, type SpeedTestResult} from '~/modules/speedtest';
import {evaluate, verdictContent} from '~/modules/verdict';
import {colors} from '~/shared/ui';
import {flatStyle} from '../../../../support/style';

function setup(idle: number, loaded: number, jitterMs?: number) {
  const result: SpeedTestResult = {
    downloadBps: 142e6,
    uploadBps: 18.5e6,
    idleLatencyMs: idle,
    loadedLatencyMs: loaded,
    latencySource: 'server',
    jitterMs,
    server: {machine: 'mlab1-tst01.example'},
    finishedAt: 0,
  };
  const onBack = jest.fn();
  render(
    <LatencyScreen
      result={result}
      verdict={evaluate({...result, onWifi: true})}
      onBack={onBack}
    />,
  );
  return onBack;
}

describe('LatencyScreen', () => {
  it('fast but laggy: grade F, idle vs loaded, scale', () => {
    setup(16, 420);
    expect(screen.getByText('LATENCY UNDER LOAD')).toBeTruthy();
    expect(screen.getByText('Grade F. This is why it stalls.')).toBeTruthy();
    expect(screen.getByText('Idle')).toBeTruthy();
    expect(screen.getByText('16')).toBeTruthy();
    expect(screen.getByText('While downloading')).toBeTruthy();
    expect(flatStyle(screen.getByText('420')).color).toBe(colors.coral);
    expect(flatStyle(screen.getByTestId('grade-F')).backgroundColor).toBe(
      colors.coral,
    );
  });

  test.each([
    [14, 52, 'Grade B. Smooth, even when busy.', 'B', colors.lime],
    [31, 210, 'Grade C. Lag spikes when busy.', 'C', colors.amber],
  ] as const)('%p/%p ms → %s', (idle, loaded, headline, grade, color) => {
    setup(idle, loaded);
    expect(screen.getByText(headline)).toBeTruthy();
    expect(
      flatStyle(screen.getByTestId(`grade-${grade}`)).backgroundColor,
    ).toBe(color);
  });

  it('Back to result calls onBack', () => {
    const onBack = setup(14, 52);
    fireEvent.press(screen.getByRole('button', {name: 'Back to result'}));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test.each([
    [4.4, '4', 'Steady'],
    [12, '12', 'Uneven'],
    [45, '45', 'Unstable'],
  ] as const)('jitter %p ms → %s, %s', (jitter, shown, level) => {
    setup(14, 52, jitter);
    expect(screen.getByText('Jitter')).toBeTruthy();
    expect(screen.getByText(shown)).toBeTruthy();
    expect(screen.getByText(level)).toBeTruthy();
    expect(screen.getByText(verdictContent.jitter.explain)).toBeTruthy();
  });

  it('unknown jitter shows a dash and no level', () => {
    setup(14, 52);
    expect(screen.getByText('Jitter')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    for (const l of ['Steady', 'Uneven', 'Unstable']) {
      expect(screen.queryByText(l)).toBeNull();
    }
    expect(screen.getByText(verdictContent.jitter.explain)).toBeTruthy();
  });

  it('headline does not depend on jitter', () => {
    setup(16, 420, 80);
    expect(screen.getByText('Grade F. This is why it stalls.')).toBeTruthy();
  });

  it('only Back to result is focusable, with initial focus', () => {
    setup(14, 52, 4);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(
      screen.getByRole('button', {name: 'Back to result'}).props
        .hasTVPreferredFocus,
    ).toBe(true);
  });
});
