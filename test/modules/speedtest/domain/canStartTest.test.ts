import {canStartTest, type StartConditions} from '~/modules/speedtest';

const ready: StartConditions = {
  consent: 'accepted',
  online: true,
  cooldownUntil: undefined,
  now: 1_000,
};

describe('canStartTest', () => {
  test.each<
    [string, Partial<StartConditions>, ReturnType<typeof canStartTest>]
  >([
    ['all clear', {}, {ok: true}],
    ['offline', {online: false}, {ok: false, reason: 'offline'}],
    ['consent pending', {consent: 'pending'}, {ok: false, reason: 'consent'}],
    [
      'consent withdrawn',
      {consent: 'withdrawn'},
      {ok: false, reason: 'consent'},
    ],
    [
      'cooldown active',
      {cooldownUntil: 1_001},
      {ok: false, reason: 'cooldown'},
    ],
    ['cooldown ends exactly now', {cooldownUntil: 1_000}, {ok: true}],
    ['cooldown in the past', {cooldownUntil: 999}, {ok: true}],
    [
      'offline wins over consent and cooldown',
      {online: false, consent: 'withdrawn', cooldownUntil: 5_000},
      {ok: false, reason: 'offline'},
    ],
    [
      'consent wins over cooldown',
      {consent: 'withdrawn', cooldownUntil: 5_000},
      {ok: false, reason: 'consent'},
    ],
  ])('%s', (_name, overrides, expected) => {
    expect(canStartTest({...ready, ...overrides})).toEqual(expected);
  });
});
