import {SpeedTestError} from '~/modules/speedtest';
import {parseNativeEvent} from '~/modules/speedtest/engines/ndt7native/nativeEvents';

const valid = {
  runId: 1,
  seq: 2,
  type: 'progress',
  bytes: 100,
  elapsedMs: 250,
  measurements: ['{}'],
};

describe('parseNativeEvent', () => {
  it('accepts progress and done events', () => {
    expect(parseNativeEvent(valid)).toEqual(valid);
    expect(
      parseNativeEvent({...valid, type: 'done', error: 'network_lost'}),
    ).toEqual({...valid, type: 'done', error: 'network_lost'});
  });

  it.each([
    ['not an object', 'x'],
    ['missing runId', {...valid, runId: undefined}],
    ['negative bytes', {...valid, bytes: -1}],
    ['NaN elapsed', {...valid, elapsedMs: Number.NaN}],
    ['unknown type', {...valid, type: 'tick'}],
    ['non-string measurement', {...valid, measurements: [1]}],
    ['measurements not an array', {...valid, measurements: '{}'}],
    ['unknown error code', {...valid, type: 'done', error: 'boom'}],
    ['TS-only error code', {...valid, type: 'done', error: 'no_servers'}],
    ['error on progress', {...valid, error: 'timeout'}],
  ])('rejects %s', (_label, payload) => {
    expect(() => parseNativeEvent(payload)).toThrow(SpeedTestError);
  });
});
