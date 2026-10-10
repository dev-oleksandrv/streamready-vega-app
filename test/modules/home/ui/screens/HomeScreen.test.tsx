import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {HomeScreen, type HomeScreenProps} from '~/modules/home';

const props = (over: Partial<HomeScreenProps> = {}): HomeScreenProps => ({
  start: {ok: true},
  cooldownSeconds: 0,
  deviceSubtitle: 'Vega OS · Wi‑Fi 5',
  onStart: jest.fn(),
  onOpenDevice: jest.fn(),
  onOpenPrivacy: jest.fn(),
  ...over,
});

describe('HomeScreen', () => {
  it('shows the hero copy and Start', () => {
    render(<HomeScreen {...props()} />);
    expect(screen.getByText('Will your TV stream in 4K?')).toBeTruthy();
    expect(screen.getByText(/One press\. About 25 seconds\./)).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Start'})).toBeTruthy();
  });

  it('shows the device card with its subtitle and opens it', () => {
    const p = props();
    render(<HomeScreen {...p} />);
    expect(screen.getByText('Vega OS · Wi‑Fi 5')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {name: 'Device & connection'}));
    expect(p.onOpenDevice).toHaveBeenCalledTimes(1);
  });

  it('opens privacy from the Privacy Policy card', () => {
    const p = props();
    render(<HomeScreen {...p} />);
    fireEvent.press(screen.getByRole('button', {name: 'Privacy Policy'}));
    expect(p.onOpenPrivacy).toHaveBeenCalledTimes(1);
  });

  it('Start calls onStart when ready', () => {
    const p = props();
    render(<HomeScreen {...p} />);
    fireEvent.press(screen.getByRole('button', {name: 'Start'}));
    expect(p.onStart).toHaveBeenCalledTimes(1);
  });

  it('has no debug card', () => {
    render(<HomeScreen {...props()} />);
    expect(screen.queryByText('Speed test (debug)')).toBeNull();
  });
});
