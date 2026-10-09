import {SpeedTestError} from '~/modules/speedtest';
import {parseMeasurement} from '~/modules/speedtest/engines/ndt7/protocol';
import {measurement} from '../../../../support/fixtures/ndt7';

function protocolCode(text: string): string | undefined {
  try {
    parseMeasurement(text);
  } catch (error) {
    return error instanceof SpeedTestError ? error.code : 'other';
  }
  return undefined;
}

describe('parseMeasurement', () => {
  it('converts microseconds to milliseconds', () => {
    expect(
      parseMeasurement(
        measurement({
          MinRTT: 12_500,
          RTT: 30_000,
          BytesReceived: 4_000,
          ElapsedTime: 2_000_000,
        }),
      ),
    ).toEqual({
      minRttMs: 12.5,
      rttMs: 30,
      bytesReceived: 4_000,
      elapsedMs: 2_000,
    });
  });

  it('returns an empty sample when TCPInfo is missing', () => {
    expect(
      parseMeasurement(
        JSON.stringify({AppInfo: {NumBytes: 1, ElapsedTime: 1}}),
      ),
    ).toEqual({});
  });

  it('drops zero RTTs and non-numeric or negative fields', () => {
    expect(
      parseMeasurement(
        measurement({MinRTT: 0, RTT: -5, BytesReceived: Number.NaN}),
      ),
    ).toEqual({
      minRttMs: undefined,
      rttMs: undefined,
      bytesReceived: undefined,
      elapsedMs: undefined,
    });
  });

  test.each(['not json', '42', 'null', '"text"'])(
    'rejects %s as a protocol error',
    (text) => {
      expect(protocolCode(text)).toBe('protocol');
    },
  );
});
