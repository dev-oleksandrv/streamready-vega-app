import {act, render, screen} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import {
  boundedCooldown,
  cooldownSeconds,
  useCooldownClock,
} from '~/app/hooks/useCooldownClock';

const Probe = ({until, active}: {until?: number; active?: boolean}) => {
  const now = useCooldownClock(until, active);
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

describe('boundedCooldown', () => {
  it.each([
    [undefined, undefined],
    [130_000, 130_000],
    [99_000, 99_000],
    // The wall clock went back: a cooldown can never be longer than COOLDOWN_MS.
    [130_001, undefined],
    [3_700_000, undefined],
  ])('until %p → %p', (until, expected) => {
    expect(boundedCooldown(until, 100_000)).toBe(expected);
  });
});

describe('useCooldownClock', () => {
  it('runs no timer for a cooldown longer than COOLDOWN_MS', () => {
    render(<Probe until={3_700_000} />);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('pauses while inactive and resumes with a fresh clock', () => {
    const {rerender} = render(<Probe until={110_000} active={false} />);
    expect(jest.getTimerCount()).toBe(0);
    jest.setSystemTime(104_000);
    rerender(<Probe until={110_000} active />);
    expect(screen.getByText('6')).toBeTruthy();
    expect(jest.getTimerCount()).toBe(1);
  });

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
