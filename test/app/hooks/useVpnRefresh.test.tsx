import {act, renderHook} from '@testing-library/react-native';
import React, {type ReactNode} from 'react';

import {useVpnRefresh} from '~/app/hooks/useVpnRefresh';
import {InsightsProvider} from '~/modules/insights';
import {emitAppState} from '../../support/fakeAppState';
import {
  createTestInsightsStore,
  FakeNetworkMonitor,
  fakeVpnSource,
} from '../../support/insights';

function setup() {
  const vpn = fakeVpnSource('off');
  const read = jest.spyOn(vpn, 'read');
  const store = createTestInsightsStore({vpn});
  const wrapper = ({children}: {children: ReactNode}) => (
    <InsightsProvider store={store} monitor={new FakeNetworkMonitor()}>
      {children}
    </InsightsProvider>
  );
  renderHook(() => useVpnRefresh(), {wrapper});
  return {vpn, read, store};
}

describe('useVpnRefresh', () => {
  afterEach(() => emitAppState('active'));

  it('reads the VPN on mount', () => {
    const {read} = setup();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('reads again when the app becomes active', () => {
    const {vpn, read, store} = setup();
    vpn.status = 'on';
    act(() => emitAppState('background'));
    act(() => emitAppState('active'));
    expect(read).toHaveBeenCalledTimes(2);
    expect(store.getState().vpn).toBe('on');
  });

  it.each(['background', 'inactive'])('ignores %s', (state) => {
    const {read} = setup();
    act(() => emitAppState(state));
    expect(read).toHaveBeenCalledTimes(1);
  });
});
