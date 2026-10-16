import {historySummary, whenLabel} from '~/modules/history';

const now = new Date(2026, 9, 16, 21, 5).getTime();

describe('whenLabel', () => {
  test.each([
    ['today', new Date(2026, 9, 16, 19, 58), 'Today, 7:58 PM'],
    ['just after midnight', new Date(2026, 9, 16, 0, 1), 'Today, 12:01 AM'],
    ['yesterday', new Date(2026, 9, 15, 23, 59), 'Yesterday, 11:59 PM'],
    ['two days ago', new Date(2026, 9, 14, 8, 30), 'Oct 14, 8:30 AM'],
    ['last year', new Date(2025, 11, 31, 12, 0), 'Dec 31, 12:00 PM'],
  ])('%s', (_name, date, expected) => {
    expect(whenLabel(date.getTime(), now)).toBe(expected);
  });
});

describe('historySummary', () => {
  test.each([
    [false, 12, 'Off'],
    [false, 0, 'Off'],
    [true, 0, 'No results yet'],
    [true, 1, '1 saved result'],
    [true, 50, '50 saved results'],
  ])('enabled %p, %p saved → %p', (enabled, count, expected) => {
    expect(historySummary(enabled, count)).toBe(expected);
  });
});
