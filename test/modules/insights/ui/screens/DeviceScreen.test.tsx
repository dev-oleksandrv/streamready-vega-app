import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {DeviceScreen, type DeviceScreenProps} from '~/modules/insights';
import {TEST_CONNECTION} from '../../../../support/insights';

const props = (over: Partial<DeviceScreenProps> = {}): DeviceScreenProps => ({
  device: {model: 'AFTOTHER', osVersion: '1.2'},
  network: {online: true, transport: 'wifi', band: '5'},
  connection: TEST_CONNECTION,
  appVersion: '0.1.0',
  onBack: jest.fn(),
  ...over,
});

describe('DeviceScreen', () => {
  it('shows the headline, the unknown-profile sub and every row', () => {
    render(<DeviceScreen {...props()} />);
    expect(screen.getByText("You're on Vega OS.")).toBeTruthy();
    expect(
      screen.getByText('These details help explain your speed test results.'),
    ).toBeTruthy();
    for (const text of [
      'AFTOTHER',
      'Vega OS 1.2',
      'Wi‑Fi · 5 GHz',
      '203.0.113.7',
      'Germany',
      'Example Net',
      '—',
      '0.1.0',
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });

  it('uses the profile name, wifi generation and limit when known', () => {
    render(
      <DeviceScreen
        {...props({device: {model: 'AFTTEST1', osVersion: '1.2'}})}
        profiles={{
          AFTTEST1: {
            name: 'Fire TV Stick 4K Select',
            wifi: 'Wi‑Fi 5',
            limitMbps: 300,
          },
        }}
      />,
    );
    expect(screen.getByText('Fire TV Stick 4K Select')).toBeTruthy();
    expect(screen.getByText('Wi‑Fi 5 · 5 GHz')).toBeTruthy();
    expect(screen.getByText('~300 Mbps')).toBeTruthy();
    expect(screen.getByText(/tops out around 300 Mbps/)).toBeTruthy();
  });

  it('hides geo rows without a visible connection', () => {
    render(<DeviceScreen {...props({connection: undefined})} />);
    expect(screen.queryByText('Public IP')).toBeNull();
    expect(screen.queryByText('Country')).toBeNull();
    expect(screen.queryByText('Provider')).toBeNull();
    expect(screen.getByText('App version')).toBeTruthy();
  });

  it('shows Offline as the connection', () => {
    render(
      <DeviceScreen
        {...props({network: {online: false, transport: 'none'}})}
      />,
    );
    expect(screen.getByText('Offline')).toBeTruthy();
  });

  it('Back calls onBack', () => {
    const p = props();
    render(<DeviceScreen {...p} />);
    fireEvent.press(screen.getByRole('button', {name: 'Back'}));
    expect(p.onBack).toHaveBeenCalledTimes(1);
  });
});
