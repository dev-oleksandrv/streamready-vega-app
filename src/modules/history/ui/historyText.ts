import {formatClock} from '~/shared/lib/format';

import {historyContent as copy} from '../content';

const DAY_MS = 86_400_000;

function localMidnight(ms: number): number {
  const date = new Date(ms);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

/** "Today, 8:41 PM", "Yesterday, 8:41 PM" or "Oct 14, 8:41 PM", in local time. */
export function whenLabel(finishedAt: number, now: number): string {
  // Rounded: a DST change makes one local day 23 or 25 hours long.
  const days = Math.round(
    (localMidnight(now) - localMidnight(finishedAt)) / DAY_MS,
  );
  const date = new Date(finishedAt);
  const day =
    days === 0
      ? copy.today
      : days === 1
      ? copy.yesterday
      : `${copy.months[date.getMonth()]} ${date.getDate()}`;
  return `${day}, ${formatClock(finishedAt)}`;
}

/** Home card subtitle: "Off", "No results yet" or "12 saved results". */
export function historySummary(enabled: boolean, count: number): string {
  if (!enabled) {
    return copy.summary.off;
  }
  return count > 0 ? copy.summary.results(count) : copy.summary.empty;
}
