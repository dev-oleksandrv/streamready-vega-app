import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {ThroughputBars} from '~/modules/speedtest';
import {colors} from '~/shared/ui';
import {flatStyle} from '../../../../support/style';

describe('ThroughputBars', () => {
  it('draws one bar per sample, scaled to the peak, colored by direction', () => {
    render(
      <ThroughputBars
        peakBps={100e6}
        bars={[
          {direction: 'download', bps: 100e6},
          {direction: 'upload', bps: 0},
        ]}
      />,
    );
    const bars = screen.getAllByTestId('throughput-bar');
    expect(bars).toHaveLength(2);
    const [dl, ul] = bars.map(flatStyle);
    expect(dl.backgroundColor).toBe(colors.lime);
    expect(parseFloat(String(dl.height))).toBeCloseTo(86.96, 1);
    expect(ul.backgroundColor).toBe(colors.chartMuted);
    expect(ul.height).toBe('2%');
  });
});
