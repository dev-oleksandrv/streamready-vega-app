import {createVegaVpnSource} from '~/modules/insights';

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('createVegaVpnSource', () => {
  it('maps the native state', () => {
    expect(createVegaVpnSource({getVpnState: () => 3}).read()).toBe('on');
    expect(createVegaVpnSource({getVpnState: () => 1}).read()).toBe('off');
    expect(createVegaVpnSource({getVpnState: () => -1}).read()).toBe(
      'unknown',
    );
  });

  it('is unknown without the native module', () => {
    expect(createVegaVpnSource(null).read()).toBe('unknown');
  });

  it('is unknown when the native call throws', () => {
    const source = createVegaVpnSource({
      getVpnState: () => {
        throw new Error('boom');
      },
    });
    expect(source.read()).toBe('unknown');
  });
});
