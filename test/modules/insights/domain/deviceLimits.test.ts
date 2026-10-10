import {
  deviceProfile,
  type DeviceProfile,
} from '~/modules/insights/domain/deviceLimits';

const STICK: DeviceProfile = {
  name: 'Fire TV Stick 4K Select',
  wifi: 'Wi‑Fi 5',
  limitMbps: 300,
};
const table = {AFTTEST1: STICK};

describe('deviceProfile', () => {
  it('finds a known codename', () => {
    expect(deviceProfile('AFTTEST1', table)).toBe(STICK);
  });
  it.each([undefined, '', 'AFTOTHER'])('returns undefined for %p', (model) => {
    expect(deviceProfile(model, table)).toBeUndefined();
  });
});
