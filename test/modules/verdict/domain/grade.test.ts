import {lagGrade} from '~/modules/verdict';

describe('lagGrade', () => {
  test.each([
    [0, 'A'],
    [29, 'A'],
    [30, 'B'],
    [59, 'B'],
    [60, 'C'],
    [199, 'C'],
    [200, 'D'],
    [399, 'D'],
    [400, 'F'],
    [5000, 'F'],
  ])('%p ms bloat → %p', (bloat, grade) => {
    expect(lagGrade(bloat)).toBe(grade);
  });
});
