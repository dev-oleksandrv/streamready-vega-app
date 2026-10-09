import {isConsentGiven, parseConsentStatus} from '~/modules/privacy';

describe('isConsentGiven', () => {
  test.each([
    ['accepted', true],
    ['pending', false],
    ['withdrawn', false],
  ] as const)('%s → %p', (status, expected) => {
    expect(isConsentGiven(status)).toBe(expected);
  });
});

describe('parseConsentStatus', () => {
  test.each([
    [{status: 'accepted'}, 'accepted'],
    [{status: 'withdrawn'}, 'withdrawn'],
    [{status: 'pending'}, 'pending'],
    [{status: 'yes'}, 'pending'],
    [{status: 1}, 'pending'],
    [{}, 'pending'],
    [null, 'pending'],
    [undefined, 'pending'],
    ['accepted', 'pending'],
  ])('%p → %s', (value, expected) => {
    expect(parseConsentStatus(value)).toBe(expected);
  });
});
