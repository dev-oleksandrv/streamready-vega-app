import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {CrossIcon} from '~/shared/ui';

describe('CrossIcon', () => {
  it('renders at the given size, stroked in the given color', () => {
    render(<CrossIcon size={28} color="#FF7A66" testID="icon" />);
    const icon = screen.getByTestId('icon');
    expect(icon.props.width).toBe(28);
    expect(icon.props.height).toBe(28);
    expect(
      screen.UNSAFE_getAllByProps({stroke: '#FF7A66'}).length,
    ).toBeGreaterThan(0);
  });
});
