import {scale} from '~/shared/ui';

// The jest kepler preset mocks the window width as 750.
describe('scale', () => {
  test.each([
    [1920, 750],
    [96, 37.5],
    [0, 0],
  ])('%p design px → %p', (px, expected) => {
    expect(scale(px)).toBeCloseTo(expected, 0);
  });
});
