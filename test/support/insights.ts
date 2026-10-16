import {
  createInsightsStore,
  INITIAL_NETWORK,
  type ConnectionInfo,
  type DeviceInfo,
  type DeviceSource,
  type GeoIpProvider,
  type NetworkMonitor,
  type NetworkStatus,
  type VpnSource,
  type VpnStatus,
} from '~/modules/insights';

export const TEST_CONNECTION: ConnectionInfo = {
  ip: '203.0.113.7',
  countryCode: 'DE',
  country: 'Germany',
  city: 'Berlin',
  isp: 'Example Net',
};

/** Resolves with `result`, or rejects when it is an Error. */
export function fakeGeo(result: ConnectionInfo | Error = TEST_CONNECTION) {
  const lookup = jest.fn(
    (_signal: AbortSignal): Promise<ConnectionInfo> =>
      result instanceof Error
        ? Promise.reject(result)
        : Promise.resolve(result),
  );
  const geo: GeoIpProvider = {id: 'fake', lookup};
  return Object.assign(geo, {lookup});
}

export function fakeDeviceSource(info: DeviceInfo = {}): DeviceSource {
  return {load: () => Promise.resolve(info)};
}

export class FakeNetworkMonitor implements NetworkMonitor {
  private listeners = new Set<(status: NetworkStatus) => void>();

  // Defaults to INITIAL_NETWORK so mounting causes no store update.
  constructor(public status: NetworkStatus = INITIAL_NETWORK) {}

  current = (): Promise<NetworkStatus> => Promise.resolve(this.status);

  subscribe = (listener: (status: NetworkStatus) => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  emit(status: NetworkStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }

  get listenerCount() {
    return this.listeners.size;
  }
}

/** `status` is mutable so a test can flip the VPN between reads. */
export function fakeVpnSource(status: VpnStatus = 'off') {
  const source = {status, read: (): VpnStatus => source.status};
  return source satisfies VpnSource;
}

export function createTestInsightsStore(
  deps: {geo?: GeoIpProvider; device?: DeviceSource; vpn?: VpnSource} = {},
) {
  return createInsightsStore({
    geo: deps.geo ?? fakeGeo(),
    device: deps.device ?? fakeDeviceSource(),
    vpn: deps.vpn ?? fakeVpnSource('unknown'),
  });
}
