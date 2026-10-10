import type {NetInfoState} from '@amazon-devices/keplerscript-netmgr-lib';

import {
  createNetInfoMonitor,
  toNetworkStatus,
  type NetInfoApi,
} from '~/modules/insights/device/netInfoMonitor';
import {INITIAL_NETWORK} from '~/modules/insights';
import {createLogger} from '~/shared/lib/logger';

const silent = createLogger('test', {enabled: false});
const state = (s: Record<string, unknown>) => s as unknown as NetInfoState;

function fakeApi(fetchResult: Promise<NetInfoState>) {
  let listener: ((s: NetInfoState) => void) | undefined;
  const unsubscribe = jest.fn();
  const api: NetInfoApi = {
    configure: jest.fn(),
    fetch: jest.fn(() => fetchResult),
    addEventListener: jest.fn((l) => {
      listener = l;
      return unsubscribe;
    }),
  };
  return {api, unsubscribe, emit: (s: NetInfoState) => listener?.(s)};
}

describe('toNetworkStatus', () => {
  it.each([
    [
      {type: 'wifi', isConnected: true, details: {frequency: 5180}},
      {online: true, transport: 'wifi', band: '5'},
    ],
    [
      {type: 'wifi', isConnected: true, details: {frequency: 2437}},
      {online: true, transport: 'wifi', band: '2.4'},
    ],
    [
      {type: 'wifi', isConnected: true, details: {frequency: null}},
      {online: true, transport: 'wifi'},
    ],
    [
      {type: 'wifi', isConnected: true, details: null},
      {online: true, transport: 'wifi'},
    ],
    [
      {type: 'ethernet', isConnected: true, details: {}},
      {online: true, transport: 'ethernet'},
    ],
    [
      {type: 'none', isConnected: false, details: null},
      {online: false, transport: 'none'},
    ],
    [
      {type: 'unknown', isConnected: null, details: null},
      {online: true, transport: 'other'},
    ],
    [
      {type: 'vpn', isConnected: true, details: {}},
      {online: true, transport: 'other'},
    ],
    [
      {type: 'wifi', isConnected: false, details: {frequency: 5180}},
      {online: false, transport: 'wifi', band: '5'},
    ],
  ])('%o → %o', (input, expected) => {
    expect(toNetworkStatus(state(input))).toEqual(expected);
  });
});

describe('netInfoMonitor', () => {
  it('turns reachability probes and SSID fetches off', () => {
    const {api} = fakeApi(new Promise(() => {}));
    createNetInfoMonitor(api, silent);
    expect(api.configure).toHaveBeenCalledTimes(1);
    const config = (api.configure as jest.Mock).mock.calls[0][0];
    expect(config.reachabilityShouldRun()).toBe(false);
    expect(config.shouldFetchWiFiSSID).toBe(false);
  });

  it('current maps fetch()', async () => {
    const {api} = fakeApi(
      Promise.resolve(
        state({type: 'ethernet', isConnected: true, details: {}}),
      ),
    );
    await expect(createNetInfoMonitor(api, silent).current()).resolves.toEqual({
      online: true,
      transport: 'ethernet',
    });
  });

  it('current falls back to the initial network when fetch rejects', async () => {
    const {api} = fakeApi(Promise.reject(new Error('no service')));
    await expect(createNetInfoMonitor(api, silent).current()).resolves.toEqual(
      INITIAL_NETWORK,
    );
  });

  it('subscribe maps events and unsubscribes', () => {
    const {api, emit, unsubscribe} = fakeApi(new Promise(() => {}));
    const listener = jest.fn();
    const stop = createNetInfoMonitor(api, silent).subscribe(listener);
    emit(state({type: 'none', isConnected: false, details: null}));
    expect(listener).toHaveBeenCalledWith({online: false, transport: 'none'});
    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
