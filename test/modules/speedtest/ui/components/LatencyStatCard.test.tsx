import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {LatencyStatCard} from '~/modules/speedtest/ui/components/LatencyStatCard';
import {flatStyle} from '../../../../support/style';

describe('LatencyStatCard', () => {
  it('shows label, value and unit, tinting the value', () => {
    render(
      <LatencyStatCard
        label="While downloading"
        value="420"
        unit="ms"
        valueColor="#FF7A66"
      />,
    );
    expect(screen.getByText('While downloading')).toBeTruthy();
    expect(screen.getByText('ms')).toBeTruthy();
    expect(flatStyle(screen.getByText('420')).color).toBe('#FF7A66');
  });
});
