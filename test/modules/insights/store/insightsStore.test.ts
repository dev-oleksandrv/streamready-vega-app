import {INITIAL_NETWORK} from '~/modules/insights';
import {
  createTestInsightsStore,
  fakeDeviceSource,
  fakeGeo,
  TEST_CONNECTION,
} from '../../../support/insights';

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('insightsStore', () => {
  it('starts idle with the initial network', () => {
    const store = createTestInsightsStore();
    expect(store.getState()).toMatchObject({
      status: 'idle',
      network: INITIAL_NETWORK,
    });
    expect(store.getState().connection).toBeUndefined();
  });

  it('refreshConnection stores the result', async () => {
    const store = createTestInsightsStore();
    const pending = store.getState().refreshConnection();
    expect(store.getState().status).toBe('loading');
    await pending;
    expect(store.getState()).toMatchObject({
      status: 'ready',
      connection: TEST_CONNECTION,
    });
  });

  it('a failure never rejects and leaves connection undefined the first time', async () => {
    const store = createTestInsightsStore({geo: fakeGeo(new Error('down'))});
    await expect(store.getState().refreshConnection()).resolves.toBeUndefined();
    expect(store.getState().status).toBe('error');
    expect(store.getState().connection).toBeUndefined();
  });

  it('a later failure keeps the cached connection', async () => {
    const geo = fakeGeo();
    const store = createTestInsightsStore({geo});
    await store.getState().refreshConnection();
    geo.lookup.mockImplementation(() => Promise.reject(new Error('down')));
    await store.getState().refreshConnection();
    expect(store.getState()).toMatchObject({
      status: 'error',
      connection: TEST_CONNECTION,
    });
  });

  it('dedupes calls while a lookup is in flight', async () => {
    const geo = fakeGeo();
    const store = createTestInsightsStore({geo});
    const a = store.getState().refreshConnection();
    const b = store.getState().refreshConnection();
    expect(a).toBe(b);
    await a;
    expect(geo.lookup).toHaveBeenCalledTimes(1);
    await store.getState().refreshConnection();
    expect(geo.lookup).toHaveBeenCalledTimes(2);
  });

  it('loadDevice stores the device; a failure leaves it undefined', async () => {
    const store = createTestInsightsStore({
      device: fakeDeviceSource({model: 'AFTTEST1'}),
    });
    await store.getState().loadDevice();
    expect(store.getState().device).toEqual({model: 'AFTTEST1'});

    const broken = createTestInsightsStore({
      device: {load: () => Promise.reject(new Error('no api'))},
    });
    await expect(broken.getState().loadDevice()).resolves.toBeUndefined();
    expect(broken.getState().device).toBeUndefined();
  });

  it('setNetwork skips equal values', () => {
    const store = createTestInsightsStore();
    const listener = jest.fn();
    store.subscribe(listener);
    store.getState().setNetwork({online: true, transport: 'other'});
    expect(listener).not.toHaveBeenCalled();
    store.getState().setNetwork({online: false, transport: 'none'});
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().network).toEqual({
      online: false,
      transport: 'none',
    });
  });
});
