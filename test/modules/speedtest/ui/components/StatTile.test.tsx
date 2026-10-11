import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {StatTile} from '~/modules/speedtest/ui/components/StatTile';
import {flatStyle} from '../../../../support/style';

describe('StatTile', () => {
  it('shows label, value and caption, tinting the value', () => {
    render(
      <StatTile
        label="Lag grade"
        value="B"
        caption="52 ms loaded"
        valueColor="#C8F560"
      />,
    );
    expect(screen.getByText('Lag grade')).toBeTruthy();
    expect(screen.getByText('52 ms loaded')).toBeTruthy();
    expect(flatStyle(screen.getByText('B')).color).toBe('#C8F560');
  });
});
