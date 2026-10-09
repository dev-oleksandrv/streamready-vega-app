import {fontFamilyFor} from '~/shared/ui';

describe('fontFamilyFor', () => {
  test.each([
    ['regular', false, 'Geist-Regular'],
    ['medium', false, 'Geist-Medium'],
    ['semibold', false, 'Geist-SemiBold'],
    ['regular', true, 'GeistMono-Regular'],
    ['medium', true, 'GeistMono-Medium'],
    ['semibold', true, 'GeistMono-Medium'],
  ] as const)('%s mono=%p → %s', (weight, mono, expected) => {
    expect(fontFamilyFor(weight, mono)).toBe(expected);
  });
});
