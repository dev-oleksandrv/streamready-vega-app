import {connectHistoryRecorder} from '~/app/providers/historyRecorder';
import type {VpnStatus} from '~/modules/insights';
import {createSessionStore} from '~/modules/speedtest';

import {createTestConsentStore} from '../../support/consent';
import {createFakeEngine, TEST_RESULT} from '../../support/fakeEngine';
import {createTestHistoryStore} from '../../support/history';
import {
  createTestInsightsStore,
  fakeGeo,
  fakeVpnSource,
  TEST_CONNECTION,
} from '../../support/insights';

async function setup({
  enabled = true,
  geoFails = false,
  vpn = 'off',
}: {enabled?: boolean; geoFails?: boolean; vpn?: VpnStatus} = {}) {
  const fake = createFakeEngine();
  const session = createSessionStore({createEngine: fake.createEngine});
  const insights = createTestInsightsStore({
    geo: fakeGeo(geoFails ? new Error('down') : TEST_CONNECTION),
    vpn: fakeVpnSource(vpn),
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  await insights.getState().refreshConnection();
  insights.getState().refreshVpn();
  const consent = await createTestConsentStore('accepted');
  const history = await createTestHistoryStore([], enabled);
  const disconnect = connectHistoryRecorder({
    session,
    insights,
    consent,
    history,
  });
  const finish = async (finishedAt = 1000) => {
    session.getState().start();
    fake.last().resolve({...TEST_RESULT, finishedAt});
    await Promise.resolve();
    await Promise.resolve();
  };
  return {session, insights, history, fake, finish, disconnect};
}

afterEach(() => jest.restoreAllMocks());

describe('connectHistoryRecorder', () => {
  it('saves a finished test with the insights and VPN state', async () => {
    const {history, finish} = await setup({vpn: 'on'});
    await finish(1000);
    expect(history.getState().entries).toEqual([
      expect.objectContaining({
        finishedAt: 1000,
        downloadBps: TEST_RESULT.downloadBps,
        grade: 'B',
        vpn: 'on',
        ip: TEST_CONNECTION.ip,
        country: TEST_CONNECTION.country,
      }),
    ]);
  });

  it('saves without geo fields when the lookup failed', async () => {
    const {history, finish} = await setup({geoFails: true});
    await finish();
    expect(history.getState().entries[0]).not.toHaveProperty('ip');
  });

  it('saves nothing while history is off', async () => {
    const {history, finish} = await setup({enabled: false});
    await finish();
    expect(history.getState().entries).toEqual([]);
  });

  it('saves nothing for a failed or stopped test', async () => {
    const {session, history, fake} = await setup();
    session.getState().start();
    fake.last().reject('network_lost');
    await Promise.resolve();
    await Promise.resolve();
    session.getState().start();
    session.getState().stop();
    expect(history.getState().entries).toEqual([]);
  });

  it('saves each finished test once', async () => {
    const {session, history, finish} = await setup();
    await finish(1000);
    session.getState().startCooldown(0, 0);
    await finish(2000);
    expect(history.getState().entries.map((e) => e.finishedAt)).toEqual([
      2000, 1000,
    ]);
  });

  it('stops after disconnect', async () => {
    const {history, finish, disconnect} = await setup();
    disconnect();
    await finish();
    expect(history.getState().entries).toEqual([]);
  });
});
