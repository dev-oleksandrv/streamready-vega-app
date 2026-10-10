import {type SpeedTestErrorCode} from '~/modules/speedtest';
import {errorVariant} from '~/modules/speedtest/domain/errorVariant';

describe('errorVariant', () => {
  it.each<[SpeedTestErrorCode, string | undefined]>([
    ['network_lost', 'connectionLost'],
    ['locate_failed', 'serversUnavailable'],
    ['no_servers', 'serversUnavailable'],
    ['connect_failed', 'interrupted'],
    ['timeout', 'interrupted'],
    ['protocol', 'interrupted'],
    ['aborted', undefined],
  ])('%s → %s', (code, variant) => {
    expect(errorVariant(code)).toBe(variant);
  });
});
