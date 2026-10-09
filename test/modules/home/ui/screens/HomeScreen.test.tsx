import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {HomeScreen} from '~/modules/home';

describe('HomeScreen', () => {
  it('shows the hero copy', () => {
    render(<HomeScreen onOpenPrivacy={jest.fn()} />);
    expect(screen.getByText('Will your TV stream in 4K?')).toBeTruthy();
    expect(screen.getByText(/One press\. About 25 seconds\./)).toBeTruthy();
  });

  it('opens privacy from the Privacy Policy card', () => {
    const onOpenPrivacy = jest.fn();
    render(<HomeScreen onOpenPrivacy={onOpenPrivacy} />);
    fireEvent.press(screen.getByRole('button', {name: 'Privacy Policy'}));
    expect(onOpenPrivacy).toHaveBeenCalledTimes(1);
  });

  it('shows the debug card only when onOpenDebug is given', () => {
    const onOpenDebug = jest.fn();
    const {rerender} = render(<HomeScreen onOpenPrivacy={jest.fn()} />);
    expect(
      screen.queryByRole('button', {name: 'Speed test (debug)'}),
    ).toBeNull();
    rerender(
      <HomeScreen onOpenPrivacy={jest.fn()} onOpenDebug={onOpenDebug} />,
    );
    fireEvent.press(screen.getByRole('button', {name: 'Speed test (debug)'}));
    expect(onOpenDebug).toHaveBeenCalledTimes(1);
  });
});
