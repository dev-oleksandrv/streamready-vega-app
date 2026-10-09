import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {FocusCard} from '~/shared/ui';

it('renders title and subtitle and calls onPress', () => {
  const onPress = jest.fn();
  render(
    <FocusCard
      title="Privacy Policy"
      subtitle="What we collect"
      onPress={onPress}
    />,
  );
  expect(screen.getByText('What we collect')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', {name: 'Privacy Policy'}));
  expect(onPress).toHaveBeenCalledTimes(1);
});
