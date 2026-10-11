import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {LatencyScreen, type SpeedTestResult} from '~/modules/speedtest';
import {evaluate} from '~/modules/verdict';
import {colors} from '~/shared/ui';
import {flatStyle} from '../../../../support/style';

function setup(idle: number, loaded: number) {
  const result: SpeedTestResult = {
    downloadBps: 142e6,
    uploadBps: 18.5e6,
    idleLatencyMs: idle,
    loadedLatencyMs: loaded,
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
});
