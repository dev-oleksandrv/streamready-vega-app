import {createVegaDeviceSource} from '~/modules/insights/device/vegaDeviceSource';
import {createLogger} from '~/shared/lib/logger';

const silent = createLogger('test', {enabled: false});

describe('vegaDeviceSource', () => {
  it('reads model and system version', async () => {
    const source = createVegaDeviceSource(
      {getModel: () => 'AFTTEST1', getSystemVersion: () => '1.2'},
      silent,
    );
    await expect(source.load()).resolves.toEqual({
      model: 'AFTTEST1',
      osVersion: '1.2',
    });
  });

  it.each([['unknown'], ['Unknown'], [''], ['  '], [undefined], [42]])(
    'treats %p as missing',
    async (value) => {
      const source = createVegaDeviceSource(
        {getModel: () => value, getSystemVersion: () => value},
        silent,
      );
      await expect(source.load()).resolves.toEqual({});
    },
  );

  it('turns a throwing getter into a missing field', async () => {
    const source = createVegaDeviceSource(
      {
        getModel: () => {
          throw new Error('unsupported');
        },
        getSystemVersion: () => '1.2',
      },
      silent,
    );
    await expect(source.load()).resolves.toEqual({osVersion: '1.2'});
  });

  it('logs the codename once for device QA', async () => {
    const sink = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const source = createVegaDeviceSource(
      {getModel: () => 'AFTTEST1', getSystemVersion: () => '1.2'},
      createLogger('insights', {enabled: true, sink}),
    );
    await source.load();
    await source.load();
    expect(sink.warn).toHaveBeenCalledTimes(1);
    expect(sink.warn.mock.calls[0].join(' ')).toContain('AFTTEST1');
  });
});
