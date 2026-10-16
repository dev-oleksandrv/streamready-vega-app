import {
  selectHistoryEntry,
  selectStartCheck,
  selectVerdict,
  selectVisibleInsights,
  selectVisibleVpn,
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

describe('selectVisibleVpn', () => {
  it.each([
    ['insights', TEST_CONNECTION, 'on', true],
    ['insights', TEST_CONNECTION, 'off', false],
    ['insights', TEST_CONNECTION, 'unknown', false],
    ['no insights', undefined, 'on', false],
  ] as const)('%s + vpn %s → %p', (_l, connection, vpn, expected) => {
    expect(selectVisibleVpn(connection, vpn)).toBe(expected);
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

describe('selectHistoryEntry', () => {
  const verdict = selectVerdict(TEST_RESULT, INITIAL_NETWORK);

  it('keeps the shown values, the grade, the VPN state and the geo insights', () => {
    expect(
      selectHistoryEntry({
        result: {...TEST_RESULT, finishedAt: 1234},
        verdict,
        connection: TEST_CONNECTION,
        vpn: 'on',
      }),
    ).toEqual({
      finishedAt: 1234,
      downloadBps: TEST_RESULT.downloadBps,
      uploadBps: TEST_RESULT.uploadBps,
      idleLatencyMs: TEST_RESULT.idleLatencyMs,
      loadedLatencyMs: TEST_RESULT.loadedLatencyMs,
      grade: verdict.grade,
      vpn: 'on',
      ip: TEST_CONNECTION.ip,
      countryCode: TEST_CONNECTION.countryCode,
      country: TEST_CONNECTION.country,
    });
  });

  it('leaves geo fields out without visible insights', () => {
    const entry = selectHistoryEntry({
      result: TEST_RESULT,
      verdict,
      connection: undefined,
      vpn: 'unknown',
    });
    expect(entry).not.toHaveProperty('ip');
    expect(entry).not.toHaveProperty('countryCode');
    expect(entry).not.toHaveProperty('country');
    expect(entry.vpn).toBe('unknown');
  });
});
