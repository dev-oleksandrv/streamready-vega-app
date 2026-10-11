import {
  selectStartCheck,
  selectVerdict,
  selectVisibleInsights,
} from '~/app/selectors';
import {INITIAL_NETWORK} from '~/modules/insights';
import {TEST_RESULT} from '../support/fakeEngine';
import {TEST_CONNECTION} from '../support/insights';

describe('selectVisibleInsights', () => {
  it.each([
    ['accepted', TEST_CONNECTION],
    ['withdrawn', undefined],
    ['pending', undefined],
  ] as const)('%s → %p', (consent, expected) => {
    expect(selectVisibleInsights(consent, TEST_CONNECTION)).toBe(expected);
  });

  it('is undefined without a connection', () => {
    expect(selectVisibleInsights('accepted', undefined)).toBeUndefined();
  });
});

describe('selectStartCheck', () => {
  const base = {
    consent: 'accepted' as const,
    network: INITIAL_NETWORK,
    now: 1000,
  };

  it('is ok when online, accepted and no cooldown', () => {
    expect(selectStartCheck(base)).toEqual({ok: true});
  });
  it('offline wins over everything', () => {
    expect(
      selectStartCheck({
        ...base,
        consent: 'withdrawn',
        network: {online: false, transport: 'none'},
        cooldownUntil: 5000,
      }),
    ).toEqual({ok: false, reason: 'offline'});
  });
  it('consent before cooldown', () => {
    expect(
      selectStartCheck({...base, consent: 'withdrawn', cooldownUntil: 5000}),
    ).toEqual({ok: false, reason: 'consent'});
  });
  it('cooldown until it expires', () => {
    expect(selectStartCheck({...base, cooldownUntil: 1001})).toEqual({
      ok: false,
      reason: 'cooldown',
    });
    expect(selectStartCheck({...base, cooldownUntil: 1000})).toEqual({
      ok: true,
    });
  });
});

describe('selectVerdict', () => {
  const wifi = {online: true, transport: 'wifi' as const, band: '5' as const};
  const profile = {
    name: 'Fire TV Stick 4K Select',
    wifi: 'Wi‑Fi 5',
    limitMbps: 300,
  };

  it('known device on Wi‑Fi near the limit', () => {
    const v = selectVerdict(TEST_RESULT, wifi, profile);
    expect(v.outcome).toBe('twoUhd');
    expect(v.nearDeviceLimit).toBe(true);
  });

  it('unknown device is never near the limit', () => {
    expect(selectVerdict(TEST_RESULT, wifi, undefined).nearDeviceLimit).toBe(
      false,
    );
  });

  it('ethernet is never near the limit', () => {
    expect(
      selectVerdict(TEST_RESULT, {online: true, transport: 'ethernet'}, profile)
        .nearDeviceLimit,
    ).toBe(false);
  });
});
