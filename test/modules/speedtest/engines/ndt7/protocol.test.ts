import {SpeedTestError} from '~/modules/speedtest';
import {
  isCloseFrameEcho,
  parseMeasurement,
} from '~/modules/speedtest/engines/ndt7/protocol';
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

  test.each(['not json', '42', 'null', '"text"', '{"TCPInfo":', 'x'])(
    'rejects %s as a protocol error',
    (text) => {
      expect(protocolCode(text)).toBe('protocol');
    },
  );
});

describe('isCloseFrameEcho', () => {
  // Vega delivers a close frame's status code (1000 = 0x03 0xE8) as a text message.
  test.each([
    ['\u0003', true],
    ['\u0003\u00e8', true],
    ['\u0003\ufffd', true],
    ['', false],
    ['x', false],
    ['{}', false],
    ['\u0003abc', false],
  ])('%j → %s', (text, expected) => {
    expect(isCloseFrameEcho(text)).toBe(expected);
  });
});
