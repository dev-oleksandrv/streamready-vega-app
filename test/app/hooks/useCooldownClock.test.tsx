import {act, render, screen} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import {cooldownSeconds, useCooldownClock} from '~/app/hooks/useCooldownClock';

const Probe = ({until}: {until?: number}) => {
  const now = useCooldownClock(until);
  return <Text>{String(cooldownSeconds(until, now))}</Text>;
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(100_000);
});
afterEach(() => jest.useRealTimers());

describe('cooldownSeconds', () => {
  it.each([
    [undefined, 0],
    [100_000, 0],
    [99_000, 0],
    [100_001, 1],
    [101_000, 1],
    [130_000, 30],
  ])('until %p → %p s', (until, seconds) => {
    expect(cooldownSeconds(until, 100_000)).toBe(seconds);
  });
});

describe('useCooldownClock', () => {
  it('ticks once a second while active, then stops', () => {
    render(<Probe until={103_000} />);
    expect(screen.getByText('3')).toBeTruthy();
    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByText('2')).toBeTruthy();
    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByText('0')).toBeTruthy();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('runs no timer without a cooldown', () => {
    render(<Probe />);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('clears the timer on unmount', () => {
    const {unmount} = render(<Probe until={130_000} />);
    expect(jest.getTimerCount()).toBe(1);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
