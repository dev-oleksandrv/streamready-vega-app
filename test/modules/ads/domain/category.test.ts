import {categoryFor} from '~/modules/ads';

describe('categoryFor', () => {
  it.each([
    ['twoUhd', 'good'],
    ['oneUhd', 'good'],
    ['laggy', 'laggy'],
    ['limited', 'limited'],
    ['hdOnly', 'limited'],
    ['buffering', 'limited'],
  ] as const)('maps %s to %s', (outcome, category) => {
    expect(categoryFor(outcome)).toBe(category);
  });
});
