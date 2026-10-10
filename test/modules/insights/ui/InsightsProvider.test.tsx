import {act, render, screen} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import {
  InsightsProvider,
  useInsights,
  type NetworkStatus,
} from '~/modules/insights';
import {
  createTestInsightsStore,
  fakeDeviceSource,
  FakeNetworkMonitor,
} from '../../../support/insights';

const Probe = () => {
  const network = useInsights((s) => s.network);
  const model = useInsights((s) => s.device?.model);
  return (
    <Text>
      {`${network.online ? 'on' : 'off'}:${network.transport}:${
        network.band ?? '-'
      }:${model ?? '-'}`}
    </Text>
  );
};

const wifi5: NetworkStatus = {online: true, transport: 'wifi', band: '5'};
const offline: NetworkStatus = {online: false, transport: 'none'};

describe('InsightsProvider', () => {
  it('loads the device and the first network reading on mount', async () => {
    const store = createTestInsightsStore({
      device: fakeDeviceSource({model: 'AFTTEST1'}),
    });
    render(
      <InsightsProvider store={store} monitor={new FakeNetworkMonitor(wifi5)}>
        <Probe />
      </InsightsProvider>,
    );
    expect(await screen.findByText('on:wifi:5:AFTTEST1')).toBeTruthy();
  });

  it('follows network events and unsubscribes on unmount', async () => {
    const monitor = new FakeNetworkMonitor();
    const {unmount} = render(
      <InsightsProvider store={createTestInsightsStore()} monitor={monitor}>
        <Probe />
      </InsightsProvider>,
    );
    act(() => monitor.emit(offline));
    expect(await screen.findByText('off:none:-:-')).toBeTruthy();
    unmount();
    expect(monitor.listenerCount).toBe(0);
  });

  it('ignores a late initial reading after an event', async () => {
    let resolveInitial!: (s: NetworkStatus) => void;
    const monitor = new FakeNetworkMonitor();
    monitor.current = () =>
      new Promise((resolve) => (resolveInitial = resolve));
    const store = createTestInsightsStore();
    render(
      <InsightsProvider store={store} monitor={monitor}>
        <Probe />
      </InsightsProvider>,
    );
    act(() => monitor.emit(offline));
    await act(async () => resolveInitial(wifi5));
    expect(store.getState().network).toEqual(offline);
  });
});
