import {isSpeedTestError, SpeedTestError} from '~/modules/speedtest';

describe('SpeedTestError', () => {
  it('carries its code and a url-free message', () => {
    const error = new SpeedTestError('connect_failed');
    expect(error.code).toBe('connect_failed');
    expect(error.name).toBe('SpeedTestError');
    expect(error.message).toBe('speedtest connect_failed');
    expect(error).toBeInstanceOf(Error);
  });

  it('is recognized by isSpeedTestError', () => {
    expect(isSpeedTestError(new SpeedTestError('aborted'))).toBe(true);
    expect(isSpeedTestError(new Error('x'))).toBe(false);
    expect(isSpeedTestError('aborted')).toBe(false);
  });
});
