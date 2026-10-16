import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {colors, FocusSwitch, scale} from '~/shared/ui';
import {flatStyle} from '../../support/style';

describe('FocusSwitch', () => {
  test.each([true, false])('reports checked = %p', (value) => {
    render(
      <FocusSwitch
        label="Save history"
        value={value}
        onValueChange={jest.fn()}
      />,
    );
    const toggle = screen.getByRole('switch', {name: 'Save history'});
    if (value) {
      expect(toggle).toBeChecked();
    } else {
      expect(toggle).not.toBeChecked();
    }
  });

  test.each([true, false])('OK flips %p', (value) => {
    const onValueChange = jest.fn();
    render(
      <FocusSwitch
        label="Save history"
        value={value}
        onValueChange={onValueChange}
      />,
    );
    fireEvent.press(screen.getByRole('switch', {name: 'Save history'}));
    expect(onValueChange).toHaveBeenCalledWith(!value);
  });

  it('applies the focused look on focus', () => {
    render(
      <FocusSwitch label="Save history" value onValueChange={jest.fn()} />,
    );
    const toggle = () => screen.getByRole('switch', {name: 'Save history'});
    fireEvent(toggle(), 'focus');
    expect(flatStyle(toggle())).toMatchObject({
      borderColor: colors.lime,
      backgroundColor: colors.surfaceFocused,
      borderWidth: scale(3),
    });
    fireEvent(toggle(), 'blur');
    expect(flatStyle(toggle())).toMatchObject({borderColor: 'transparent'});
  });
});
