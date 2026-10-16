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

  it('parses client rtt in microseconds to ms', () => {
    expect(
      parseNativeEvent({...valid, clientMinRttUs: 27_827, clientRttUs: 35_567}),
    ).toEqual({...valid, client: {minRttMs: 27.827, rttMs: 35.567}});
  });

  it.each([
    ['zero rtt', {clientMinRttUs: 1000, clientRttUs: 0}],
    ['negative', {clientMinRttUs: -1, clientRttUs: 1000}],
    ['NaN', {clientMinRttUs: Number.NaN, clientRttUs: 1000}],
    ['string', {clientMinRttUs: '1', clientRttUs: 1000}],
    ['only one field', {clientRttUs: 1000}],
  ])('drops malformed client rtt (%s) without failing', (_l, extra) => {
    expect(parseNativeEvent({...valid, ...extra})).toEqual(valid);
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
