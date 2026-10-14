import {evaluate, type Verdict, type VerdictInput} from '~/modules/verdict';

const mbps = (value: number) => value * 1e6;

function input(
  dl: number,
  idle: number,
  loaded: number,
  extra: Partial<VerdictInput> = {},
): VerdictInput {
  return {
    downloadBps: mbps(dl),
    idleLatencyMs: idle,
    loadedLatencyMs: loaded,
    deviceLimitMbps: 300,
    onWifi: true,
    ...extra,
  };
}

const passed = (v: Verdict) =>
  v.checks.filter((c) => c.passed).map((c) => c.id);

describe('evaluate: design scenarios', () => {
  test.each([
    [
      'good',
      186.4,
      14,
      52,
      'twoUhd',
      'good',
      'good',
      'B',
      'good',
      ['hd', 'fhd', 'uhd', 'uhd2x'],
      true,
    ],
    [
      'goodSingle4K',
      38.2,
      18,
      61,
      'oneUhd',
      'good',
      'good',
      'B',
      'good',
      ['hd', 'fhd', 'uhd'],
      false,
    ],
    [
      'fastButLaggy',
      142,
      16,
      420,
      'laggy',
      'limited',
      'warn',
      'F',
      'bad',
      ['hd', 'fhd', 'uhd', 'uhd2x'],
      false,
    ],
    [
      'limited',
      17.4,
      31,
      210,
      'limited',
      'limited',
      'warn',
      'C',
      'warn',
      ['hd', 'fhd'],
      false,
    ],
    [
      'poorHdOnly',
      4.1,
      64,
      480,
      'hdOnly',
      'poor',
      'bad',
      'F',
      'bad',
      ['hd'],
      false,
    ],
    ['poor', 1.8, 88, 520, 'buffering', 'poor', 'bad', 'F', 'bad', [], false],
  ] as const)(
    '%s',
    (
      _name,
      dl,
      idle,
      loaded,
      outcome,
      tier,
      tone,
      grade,
      gradeTone,
      checks,
      near,
    ) => {
      const v = evaluate(input(dl, idle, loaded));
      expect(v.outcome).toBe(outcome);
      expect(v.tier).toBe(tier);
      expect(v.tone).toBe(tone);
      expect(v.grade).toBe(grade);
      expect(v.gradeTone).toBe(gradeTone);
      expect(passed(v)).toEqual(checks);
      expect(v.nearDeviceLimit).toBe(near);
    },
  );

  it('lists checks in design order with their minimums', () => {
    expect(
      evaluate(input(10, 10, 10)).checks.map((c) => [c.id, c.minMbps]),
    ).toEqual([
      ['hd', 3],
      ['fhd', 5],
      ['uhd', 25],
      ['uhd2x', 50],
    ]);
  });
});

describe('evaluate: boundaries (displayed values)', () => {
  // A download that shows as "3.0" passes the 3 Mbps check.
  test.each([
    [2.94, 'buffering', []],
    [2.96, 'hdOnly', ['hd']],
    [3, 'hdOnly', ['hd']],
    [4.94, 'hdOnly', ['hd']],
    [4.96, 'limited', ['hd', 'fhd']],
    [24.94, 'limited', ['hd', 'fhd']],
    [24.96, 'oneUhd', ['hd', 'fhd', 'uhd']],
    [49.94, 'oneUhd', ['hd', 'fhd', 'uhd']],
    [49.96, 'twoUhd', ['hd', 'fhd', 'uhd', 'uhd2x']],
  ] as const)('%p Mbps → %s', (dl, outcome, checks) => {
    const v = evaluate(input(dl, 10, 20));
    expect(v.outcome).toBe(outcome);
    expect(passed(v)).toEqual(checks);
  });

  test.each([
    ['C', 199, 'oneUhd', 'good'],
    ['D', 200, 'laggy', 'limited'],
    ['F', 400, 'laggy', 'limited'],
  ] as const)('grade %s at fast speed → %s', (_g, bloat, outcome, tier) => {
    const v = evaluate(input(30, 10, 10 + bloat));
    expect(v.outcome).toBe(outcome);
    expect(v.tier).toBe(tier);
  });

  it('a slow D/F connection stays limited, not laggy', () => {
    expect(evaluate(input(10, 10, 500)).outcome).toBe('limited');
  });

  it('bloat comes from whole-ms values', () => {
    // 10.4 → 10, 39.6 → 40: bloat 30 → B (raw 29.2 would be A).
    expect(evaluate(input(30, 10.4, 39.6)).grade).toBe('B');
  });
});

describe('evaluate: near device limit', () => {
  test.each([
    ['exactly 60 %', 180, {}, true],
    ['just below', 179.4, {}, false],
    ['unknown device', 290, {deviceLimitMbps: undefined}, false],
    ['not on Wi‑Fi', 290, {onWifi: false}, false],
  ] as const)('%s', (_name, dl, extra, expected) => {
    expect(evaluate(input(dl, 10, 20, extra)).nearDeviceLimit).toBe(expected);
  });
});

describe('evaluate: transport', () => {
  test.each([true, false])('passes onWifi %s through', (onWifi) => {
    expect(evaluate(input(10, 10, 20, {onWifi})).onWifi).toBe(onWifi);
  });
});

describe('evaluate: odd inputs', () => {
  it('negative bloat grades A', () => {
    const v = evaluate(input(30, 40, 20));
    expect(v.bloatMs).toBe(0);
    expect(v.grade).toBe('A');
  });

  it('non-finite latency grades A', () => {
    const v = evaluate(input(30, Number.NaN, 20));
    expect(v.bloatMs).toBe(0);
    expect(v.grade).toBe('A');
  });

  test.each([Number.NaN, -1, Number.POSITIVE_INFINITY])(
    'download %p counts as 0',
    (bps) => {
      const v = evaluate({...input(0, 10, 20), downloadBps: bps});
      expect(v.outcome).toBe('buffering');
      expect(passed(v)).toEqual([]);
    },
  );
});
