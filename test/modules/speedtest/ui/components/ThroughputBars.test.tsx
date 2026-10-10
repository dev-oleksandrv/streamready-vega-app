import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {ThroughputBars} from '~/modules/speedtest/ui/components/ThroughputBars';
import {colors} from '~/shared/ui';
import {flatStyle} from '../../../../support/style';

describe('ThroughputBars', () => {
  it('draws one bar per sample, colored by direction', () => {
    render(
      <ThroughputBars
        peakBps={100e6}
        bars={[
          {direction: 'download', bps: 100e6},
          {direction: 'upload', bps: 0},
        ]}
      />,
    );
    const bars = screen.getAllByTestId('throughput-bar').map(flatStyle);
    expect(bars).toHaveLength(2);
    expect(bars[0].backgroundColor).toBe(colors.lime);
    expect(bars[1].backgroundColor).toBe(colors.chartMuted);
  });
});
