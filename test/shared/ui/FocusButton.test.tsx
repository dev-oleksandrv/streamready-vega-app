import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {colors, FocusButton} from '~/shared/ui';
import {flatStyle} from '../../support/style';

describe('FocusButton', () => {
  it('calls onPress', () => {
    const onPress = jest.fn();
    render(<FocusButton label="Back" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', {name: 'Back'}));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses when disabled but stays rendered as a button', () => {
    const onPress = jest.fn();
    render(<FocusButton label="Start" onPress={onPress} disabled />);
    const button = screen.getByRole('button', {name: 'Start'});
    expect(button).toBeDisabled();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner, reports busy and ignores presses while loading', () => {
    const onPress = jest.fn();
    render(<FocusButton label="Accept & continue" onPress={onPress} loading />);
    const button = screen.getByRole('button', {name: 'Accept & continue'});
    expect(button).toBeBusy();
    expect(
      screen.getByTestId('spinner', {includeHiddenElements: true}),
    ).toBeTruthy();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('applies the focused look on focus and drops it on blur', () => {
    render(<FocusButton label="Back" onPress={jest.fn()} />);
    const button = () => screen.getByRole('button', {name: 'Back'});
    fireEvent(button(), 'focus');
    expect(flatStyle(button())).toMatchObject({
      borderColor: colors.lime,
      transform: [{scale: 1.05}],
    });
    fireEvent(button(), 'blur');
    expect(flatStyle(button())).toMatchObject({
      borderColor: 'transparent',
      transform: [{scale: 1}],
    });
  });
});
