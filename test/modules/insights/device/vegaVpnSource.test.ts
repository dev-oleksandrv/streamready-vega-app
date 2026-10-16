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

  it('logs the module presence and raw state once, for device QA', () => {
    const warn = jest.fn();
    const log = {debug: jest.fn(), info: jest.fn(), warn, error: jest.fn()};
    const source = createVegaVpnSource({getVpnState: () => 3}, log);
    source.read();
    source.read();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('vpn', 'module', 3);
  });

  it('logs a missing module once', () => {
    const warn = jest.fn();
    const log = {debug: jest.fn(), info: jest.fn(), warn, error: jest.fn()};
    createVegaVpnSource(null, log).read();
    expect(warn).toHaveBeenCalledWith('vpn', 'no module');
  });
});
