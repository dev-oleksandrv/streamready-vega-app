import {render, screen} from '@testing-library/react-native';
import React from 'react';
import {Animated} from 'react-native';

import {LiveReading} from '~/modules/speedtest/ui/components/LiveReading';

// Animations would finish on real timers after the test, outside act().
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const reading = (label: string, value: string) => (
  <LiveReading label={label} value={value} unit="Mbps" blinking={false} />
);

describe('LiveReading', () => {
  it('shows label, value and unit', () => {
    render(reading('Download', '87.4'));
    expect(screen.getByText('Download')).toBeTruthy();
    expect(screen.getByText('87.4')).toBeTruthy();
    expect(screen.getByText('Mbps')).toBeTruthy();
  });

  it('fades in on a phase change only, not on every value', () => {
    const view = render(reading('Download', '87.4'));
    const timing = jest.spyOn(Animated, 'timing');
    view.rerender(reading('Download', '90.1'));
    expect(timing).not.toHaveBeenCalled();
    view.rerender(reading('Upload', '—'));
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0][1].toValue).toBe(1);
  });
});
