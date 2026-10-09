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
});
