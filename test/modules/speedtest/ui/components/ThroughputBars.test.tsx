import {render, screen} from '@testing-library/react-native';
import React from 'react';
import {Animated} from 'react-native';

import {CHART_SLOTS} from '~/modules/speedtest/store/sessionStore';
import {ThroughputBars} from '~/modules/speedtest/ui/components/ThroughputBars';
import {colors} from '~/shared/ui';
import {flatStyle} from '../../../../support/style';

// Animations would finish on real timers after the test, outside act().
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('ThroughputBars', () => {
  it('scales each bar to its share of the stepped chart top', () => {
    const timing = jest.spyOn(Animated, 'timing');
    render(
      <ThroughputBars
        peakBps={100e6}
        bars={[
          {slot: 0, direction: 'download', bps: 100e6},
          {slot: 40, direction: 'upload', bps: 0},
        ]}
      />,
    );
    // Peak 100 Mbps + headroom → 150 Mbps top.
    expect(timing.mock.calls.map(([, config]) => config.toValue)).toEqual([
      100e6 / 150e6,
      0.02,
    ]);
  });

  it('lays out every chart slot, with a bar colored by direction in each filled one', () => {
    render(
      <ThroughputBars
        peakBps={100e6}
        bars={[
          {slot: 2, direction: 'download', bps: 100e6},
          {slot: 41, direction: 'upload', bps: 0},
        ]}
      />,
    );
    const bars = screen.getAllByTestId('throughput-bar').map(flatStyle);
    expect(bars).toHaveLength(2);
    expect(bars[0].backgroundColor).toBe(colors.lime);
    expect(bars[1].backgroundColor).toBe(colors.chartMuted);
    expect(screen.getAllByTestId('throughput-slot')).toHaveLength(
      CHART_SLOTS - 2,
    );
  });
});
