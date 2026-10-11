import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {CheckIcon} from '~/shared/ui';

describe('CheckIcon', () => {
  it('renders at the given size, stroked in the given color', () => {
    render(<CheckIcon size={28} color="#0B0C0E" testID="icon" />);
    const icon = screen.getByTestId('icon');
    expect(icon.props.width).toBe(28);
    expect(icon.props.height).toBe(28);
    expect(
      screen.UNSAFE_getAllByProps({stroke: '#0B0C0E'}).length,
    ).toBeGreaterThan(0);
  });
});
