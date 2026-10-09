import {createLogger, redact} from '~/shared/lib/logger';

const makeSink = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

describe('redact', () => {
  it('masks access_token values in query strings', () => {
    expect(
      redact(
        'wss://ndt.example.net/ndt/v7/download?access_token=abc.def-123&x=1',
      ),
    ).toBe('wss://ndt.example.net/ndt/v7/download?access_token=***&x=1');
  });

  it('leaves other text untouched', () => {
    expect(redact('no secrets here')).toBe('no secrets here');
  });
});

describe('createLogger', () => {
  it('prefixes the scope and forwards to the sink', () => {
    const sink = makeSink();
    createLogger('privacy', {enabled: true, sink}).warn('failed', 42);
    expect(sink.warn).toHaveBeenCalledWith('[privacy]', 'failed', 42);
  });

  it('redacts string arguments and error messages', () => {
    const sink = makeSink();
    const log = createLogger('ndt7', {enabled: true, sink});
    log.error(
      'connect ?access_token=s3cret',
      new Error('at ?access_token=s3cret'),
    );
    const args = sink.error.mock.calls[0];
    expect(args[1]).toBe('connect ?access_token=***');
    expect(args[2]).toBe('Error: at ?access_token=***');
  });

  it('redacts tokens inside plain objects', () => {
    const sink = makeSink();
    createLogger('ndt7', {enabled: true, sink}).warn('locate', {
      url: 'wss://ndt.example.net/x?access_token=s3cret',
    });
    expect(JSON.stringify(sink.warn.mock.calls[0])).not.toContain('s3cret');
  });

  it('passes objects without tokens through unchanged', () => {
    const sink = makeSink();
    const payload = {status: 429};
    createLogger('x', {enabled: true, sink}).warn('locate', payload);
    expect(sink.warn.mock.calls[0][2]).toBe(payload);
  });

  it('prints nothing when disabled', () => {
    const sink = makeSink();
    const log = createLogger('x', {enabled: false, sink});
    log.debug('a');
    log.info('a');
    log.warn('a');
    log.error('a');
    expect(Object.values(sink).every((fn) => fn.mock.calls.length === 0)).toBe(
      true,
    );
  });
});
