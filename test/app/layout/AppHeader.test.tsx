import {act, screen} from '@testing-library/react-native';
import React from 'react';

import {AppHeader} from '~/app/layout/AppHeader';
import type {NetworkStatus, VpnStatus} from '~/modules/insights';
import type {ConsentStatus} from '~/modules/privacy';
import {colors} from '~/shared/ui';
import {createTestConsentStore} from '../../support/consent';
import {
  createTestInsightsStore,
  FakeNetworkMonitor,
  fakeVpnSource,
} from '../../support/insights';
import {renderWithProviders} from '../../support/renderWithProviders';
import {flatStyle} from '../../support/style';

async function renderHeader(
  status: ConsentStatus,
  network?: NetworkStatus,
  withGeo = true,
  vpn: VpnStatus = 'off',
) {
  const consentStore = await createTestConsentStore(status);
  const insightsStore = createTestInsightsStore({vpn: fakeVpnSource(vpn)});
  insightsStore.getState().refreshVpn();
  if (withGeo) {
    await insightsStore.getState().refreshConnection();
  }
  const networkMonitor = new FakeNetworkMonitor(network);
  renderWithProviders(<AppHeader />, {
    consentStore,
    insightsStore,
    networkMonitor,
  });
  await act(async () => {});
  return {consentStore, networkMonitor};
}

describe('AppHeader', () => {
  it('shows country chip, name, IP and network when consent is accepted', async () => {
    await renderHeader('accepted', {
      online: true,
      transport: 'wifi',
      band: '5',
    });
    expect(screen.getByText('DE')).toBeTruthy();
    expect(screen.getByText('Germany')).toBeTruthy();
    expect(screen.getByText('203.0.113.7')).toBeTruthy();
    expect(screen.getByText('Wi‑Fi · 5 GHz')).toBeTruthy();
  });

  it.each(['withdrawn', 'pending'] as const)(
    'hides geo when consent is %s',
    async (status) => {
      await renderHeader(status);
      expect(screen.queryByText('203.0.113.7')).toBeNull();
      expect(screen.queryByText('Germany')).toBeNull();
      expect(screen.getByText('Connected')).toBeTruthy();
    },
  );

  it('hides geo when the lookup never succeeded', async () => {
    await renderHeader('accepted', undefined, false);
    expect(screen.queryByText('DE')).toBeNull();
  });

  it.each<[NetworkStatus, string]>([
    [{online: true, transport: 'wifi'}, 'Wi‑Fi'],
    [{online: true, transport: 'ethernet'}, 'Ethernet'],
    [{online: true, transport: 'other'}, 'Connected'],
    [{online: false, transport: 'none'}, 'Offline'],
  ])('labels %o as %s', async (network, label) => {
    await renderHeader('accepted', network);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('shows the VPN badge with insights when the VPN is on', async () => {
    await renderHeader('accepted', undefined, true, 'on');
    expect(screen.getByText('VPN on')).toBeTruthy();
  });

  it.each([
    ['vpn off', 'accepted', true, 'off'],
    ['consent withdrawn', 'withdrawn', true, 'on'],
    ['no geo', 'accepted', false, 'on'],
  ] as const)('hides the VPN badge when %s', async (_l, consent, geo, vpn) => {
    await renderHeader(consent, undefined, geo, vpn);
    expect(screen.queryByText('VPN on')).toBeNull();
  });

  it('turns the dot red when the network drops', async () => {
    const {networkMonitor} = await renderHeader('accepted');
    expect(flatStyle(screen.getByTestId('network-dot')).backgroundColor).toBe(
      colors.lime,
    );
    act(() => networkMonitor.emit({online: false, transport: 'none'}));
    expect(screen.getByText('Offline')).toBeTruthy();
    expect(flatStyle(screen.getByTestId('network-dot')).backgroundColor).toBe(
      colors.offline,
    );
  });
});
