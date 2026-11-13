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

  it('shows a tinted caption when given', () => {
    render(
      <LatencyStatCard
        label="Jitter"
        value="4"
        unit="ms"
        caption="Steady"
        captionColor="#A3E635"
      />,
    );
    expect(flatStyle(screen.getByText('Steady')).color).toBe('#A3E635');
  });

  it('renders no caption by default', () => {
    render(<LatencyStatCard label="Idle" value="16" unit="ms" />);
    expect(screen.queryByText('Steady')).toBeNull();
    expect(screen.getAllByText(/./)).toHaveLength(3);
  });
});
