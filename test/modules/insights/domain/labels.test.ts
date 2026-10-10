import type {DeviceProfile} from '~/modules/insights/domain/deviceLimits';
import {
  connectionLabel,
  deviceSubtitle,
  homeConnectionLabel,
  limitLabel,
  systemLabel,
} from '~/modules/insights/domain/labels';
import type {NetworkStatus} from '~/modules/insights/domain/network';

const STICK: DeviceProfile = {
  name: 'Fire TV Stick 4K Select',
  wifi: 'Wi‑Fi 5',
  limitMbps: 300,
};
const offline: NetworkStatus = {online: false, transport: 'none'};
const wifi5: NetworkStatus = {online: true, transport: 'wifi', band: '5'};
const wifi: NetworkStatus = {online: true, transport: 'wifi'};
const ethernet: NetworkStatus = {online: true, transport: 'ethernet'};
const other: NetworkStatus = {online: true, transport: 'other'};

describe('connectionLabel', () => {
  it.each<[NetworkStatus, DeviceProfile | undefined, string]>([
    [offline, STICK, 'Offline'],
    [{online: false, transport: 'wifi', band: '5'}, undefined, 'Offline'],
    [wifi5, undefined, 'Wi‑Fi · 5 GHz'],
    [wifi5, STICK, 'Wi‑Fi 5 · 5 GHz'],
    [
      {online: true, transport: 'wifi', band: '2.4'},
      undefined,
      'Wi‑Fi · 2.4 GHz',
    ],
    [{online: true, transport: 'wifi', band: '6'}, undefined, 'Wi‑Fi · 6 GHz'],
    [wifi, undefined, 'Wi‑Fi'],
    [wifi, STICK, 'Wi‑Fi 5'],
    [ethernet, STICK, 'Ethernet'],
    [other, undefined, 'Connected'],
  ])('%o + %o → %s', (network, profile, label) => {
    expect(connectionLabel(network, profile)).toBe(label);
  });
});

describe('homeConnectionLabel / deviceSubtitle', () => {
  it.each<[NetworkStatus, DeviceProfile | undefined, string]>([
    [wifi5, STICK, 'Wi‑Fi 5'],
    [wifi5, undefined, 'Wi‑Fi'],
    [ethernet, undefined, 'Ethernet'],
    [offline, STICK, 'Offline'],
    [other, undefined, 'Connected'],
  ])('%o + %o → %s', (network, profile, label) => {
    expect(homeConnectionLabel(network, profile)).toBe(label);
    expect(deviceSubtitle(network, profile)).toBe(`Vega OS · ${label}`);
  });
});

describe('systemLabel / limitLabel', () => {
  it('formats the system', () => {
    expect(systemLabel('1.2')).toBe('Vega OS 1.2');
    expect(systemLabel(undefined)).toBe('Vega OS');
  });
  it('formats the limit', () => {
    expect(limitLabel(STICK)).toBe('~300 Mbps');
    expect(limitLabel(undefined)).toBe('—');
  });
});
