import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {StartButton} from '~/modules/home/ui/components/StartButton';
import type {StartCheck} from '~/modules/speedtest';

const press = () =>
  fireEvent.press(screen.getByRole('button', {name: 'Start'}));
const pulse = () =>
  screen.queryByTestId('start-pulse', {includeHiddenElements: true});

describe('StartButton', () => {
  it('ready: Start + Press OK, press calls onStart', () => {
    const onStart = jest.fn();
    render(
      <StartButton start={{ok: true}} cooldownSeconds={0} onStart={onStart} />,
    );
    expect(screen.getByText('Start')).toBeTruthy();
    expect(screen.getByText('Press OK')).toBeTruthy();
    press();
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it.each<[StartCheck, string]>([
    [{ok: false, reason: 'offline'}, 'You are offline'],
    [{ok: false, reason: 'consent'}, 'Privacy consent withdrawn'],
  ])('%o shows %s and ignores presses', (start, hint) => {
    const onStart = jest.fn();
    render(<StartButton start={start} cooldownSeconds={0} onStart={onStart} />);
    expect(screen.getByText(hint)).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Start'})).toBeDisabled();
    press();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('cooldown shows the countdown and ignores presses', () => {
    const onStart = jest.fn();
    render(
      <StartButton
        start={{ok: false, reason: 'cooldown'}}
        cooldownSeconds={27}
        onStart={onStart}
      />,
    );
    expect(screen.getByText('Next test in')).toBeTruthy();
    expect(screen.getByText('0:27')).toBeTruthy();
    press();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('pulses only while ready and focused', () => {
    const {rerender} = render(
      <StartButton
        start={{ok: true}}
        cooldownSeconds={0}
        onStart={jest.fn()}
      />,
    );
    expect(pulse()).toBeNull();
    fireEvent(screen.getByRole('button', {name: 'Start'}), 'focus');
    expect(pulse()).toBeTruthy();
    rerender(
      <StartButton
        start={{ok: false, reason: 'offline'}}
        cooldownSeconds={0}
        onStart={jest.fn()}
      />,
    );
    expect(pulse()).toBeNull();
    rerender(
      <StartButton
        start={{ok: true}}
        cooldownSeconds={0}
        onStart={jest.fn()}
      />,
    );
    expect(pulse()).toBeTruthy();
    fireEvent(screen.getByRole('button', {name: 'Start'}), 'blur');
    expect(pulse()).toBeNull();
  });
});
