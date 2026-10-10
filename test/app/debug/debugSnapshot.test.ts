import {applyEngineEvent} from '~/app/debug/debugSnapshot';

describe('applyEngineEvent', () => {
  it('folds events into a snapshot', () => {
    let s = applyEngineEvent({}, {type: 'phase', phase: 'download'});
    s = applyEngineEvent(s, {type: 'server', server: {machine: 'm1'}});
    s = applyEngineEvent(s, {
      type: 'throughput',
      direction: 'download',
      bps: 5e6,
      elapsedMs: 250,
    });
    s = applyEngineEvent(s, {
      type: 'throughput',
      direction: 'upload',
      bps: 2e6,
      elapsedMs: 250,
    });
    s = applyEngineEvent(s, {type: 'latency', idleMs: 12});
    s = applyEngineEvent(s, {type: 'latency', loadedMs: 40});
    expect(s).toEqual({
      phase: 'download',
      server: {machine: 'm1'},
      downloadBps: 5e6,
      uploadBps: 2e6,
      idleMs: 12,
      loadedMs: 40,
    });
  });

  it('returns a new object', () => {
    const before = {};
    expect(applyEngineEvent(before, {type: 'phase', phase: 'upload'})).not.toBe(
      before,
    );
  });
});
