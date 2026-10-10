import type {DeviceProfile} from '~/modules/insights/domain/deviceLimits';
import {deviceRows} from '~/modules/insights/domain/deviceRows';

const STICK: DeviceProfile = {
  name: 'Fire TV Stick 4K Select',
  wifi: 'Wi‑Fi 5',
  limitMbps: 300,
};
const connection = {
  ip: '203.0.113.7',
  countryCode: 'DE',
  country: 'Germany',
  isp: 'Example Net',
};

describe('deviceRows', () => {
  it('lists every row in design order with a known profile', () => {
    const rows = deviceRows({
      device: {model: 'AFTTEST1', osVersion: '1.2'},
      profile: STICK,
      network: {online: true, transport: 'wifi', band: '5'},
      connection,
      appVersion: '0.1.0',
    });
    expect(rows.map((r) => [r.label, r.value])).toEqual([
      ['Model', 'Fire TV Stick 4K Select'],
      ['System', 'Vega OS 1.2'],
      ['Connection', 'Wi‑Fi 5 · 5 GHz'],
      ['Public IP', '203.0.113.7'],
      ['Country', 'Germany'],
      ['Provider', 'Example Net'],
      ['Device limit', '~300 Mbps'],
      ['App version', '0.1.0'],
    ]);
  });

  it('shows the codename and a dash when the model is unknown', () => {
    const rows = deviceRows({
      device: {model: 'AFTOTHER'},
      network: {online: true, transport: 'ethernet'},
      appVersion: '0.1.0',
    });
    expect(rows.map((r) => [r.label, r.value])).toEqual([
      ['Model', 'AFTOTHER'],
      ['System', 'Vega OS'],
      ['Connection', 'Ethernet'],
      ['Device limit', '—'],
      ['App version', '0.1.0'],
    ]);
  });

  it('omits Model without a device and Provider without an ISP', () => {
    const rows = deviceRows({
      network: {online: false, transport: 'none'},
      connection: {ip: '203.0.113.7', countryCode: 'DE', country: 'Germany'},
      appVersion: '0.1.0',
    });
    expect(rows.map((r) => r.label)).toEqual([
      'System',
      'Connection',
      'Public IP',
      'Country',
      'Device limit',
      'App version',
    ]);
    expect(rows.find((r) => r.label === 'Connection')?.value).toBe('Offline');
  });
});
