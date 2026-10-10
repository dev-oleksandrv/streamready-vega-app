import {render, screen} from '@testing-library/react-native';
import React from 'react';
import {Animated} from 'react-native';

import {NO_PROGRESS} from '~/modules/speedtest/domain/progress';
import {PhaseSteps} from '~/modules/speedtest/ui/components/PhaseSteps';

const timingTargets = (spy: jest.SpyInstance) =>
  spy.mock.calls.map(([, config]) => config.toValue);

// Animations would finish on real timers after the test, outside act().
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('PhaseSteps', () => {
  it('shows the three steps', () => {
    render(<PhaseSteps progress={NO_PROGRESS} />);
    expect(screen.getByText('Ping')).toBeTruthy();
    expect(screen.getByText('Download')).toBeTruthy();
    expect(screen.getByText('Upload')).toBeTruthy();
  });

  it('glides a fill to its new progress', () => {
    const view = render(
      <PhaseSteps progress={{ping: 1, download: 0.4, upload: 0}} />,
    );
    const timing = jest.spyOn(Animated, 'timing');
    view.rerender(
      <PhaseSteps progress={{ping: 1, download: 0.6, upload: 0}} />,
    );
    expect(timingTargets(timing)).toEqual([0.6]);
  });

  it('resets without draining when a new run starts', () => {
    const view = render(
      <PhaseSteps progress={{ping: 1, download: 1, upload: 1}} />,
    );
    const timing = jest.spyOn(Animated, 'timing');
    view.rerender(<PhaseSteps progress={NO_PROGRESS} />);
    expect(timing).not.toHaveBeenCalled();
  });
});
