import {act, renderHook} from '@testing-library/react-native';
import React, {type ReactNode} from 'react';

import {useVpnRefresh} from '~/app/hooks/useVpnRefresh';
import {AppProviders} from '~/app/providers/AppProviders';
import type {ConsentStatus} from '~/modules/privacy';
import {createTestConsentStore} from '../../support/consent';
import {emitAppState} from '../../support/fakeAppState';
import {
  createTestInsightsStore,
  fakeGeo,
  FakeNetworkMonitor,
  fakeVpnSource,
} from '../../support/insights';

async function setup(consent: ConsentStatus = 'accepted') {
  const vpn = fakeVpnSource('off');
  const read = jest.spyOn(vpn, 'read');
  const geo = fakeGeo();
  const store = createTestInsightsStore({vpn, geo});
  const consentStore = await createTestConsentStore(consent);
  const wrapper = ({children}: {children: ReactNode}) => (
    <AppProviders
      consentStore={consentStore}
      insightsStore={store}
      networkMonitor={new FakeNetworkMonitor()}>
      {children}
    </AppProviders>
  );
  renderHook(() => useVpnRefresh(), {wrapper});
  await act(async () => {});
  return {vpn, read, store, geo};
}

const returnToApp = async () => {
  act(() => emitAppState('background'));
  await act(async () => emitAppState('active'));
};

describe('useVpnRefresh', () => {
  afterEach(() => emitAppState('active'));

  it('reads the VPN on mount without a geo lookup', async () => {
    const {read, geo} = await setup();
    expect(read).toHaveBeenCalledTimes(1);
    expect(geo.lookup).not.toHaveBeenCalled();
  });

  it('reads again when the app becomes active', async () => {
    const {vpn, read, store} = await setup();
    vpn.status = 'on';
    await returnToApp();
    expect(read).toHaveBeenCalledTimes(2);
    expect(store.getState().vpn).toBe('on');
  });

  it.each(['background', 'inactive'])('ignores %s', async (state) => {
    const {read} = await setup();
    act(() => emitAppState(state));
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('refreshes geo when the VPN flips, since the public IP changed', async () => {
    const {vpn, geo} = await setup();
    vpn.status = 'on';
    await returnToApp();
    expect(geo.lookup).toHaveBeenCalledTimes(1);
    vpn.status = 'off';
    await returnToApp();
    expect(geo.lookup).toHaveBeenCalledTimes(2);
  });

  it('does not refresh geo when the VPN is unchanged', async () => {
    const {geo} = await setup();
    await returnToApp();
    expect(geo.lookup).not.toHaveBeenCalled();
  });

  it('does not refresh geo when the VPN becomes unknown', async () => {
    const {vpn, geo} = await setup();
    vpn.status = 'unknown';
    await returnToApp();
    expect(geo.lookup).not.toHaveBeenCalled();
  });

  it.each(['withdrawn', 'pending'] as const)(
    'does not refresh geo when consent is %s',
    async (consent) => {
      const {vpn, geo} = await setup(consent);
      vpn.status = 'on';
      await returnToApp();
      expect(geo.lookup).not.toHaveBeenCalled();
    },
  );
});
