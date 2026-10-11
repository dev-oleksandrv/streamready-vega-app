import {formatClock} from '~/shared/lib/format';

import {testContent} from '../content';
import type {SpeedTestResult} from '../domain/engine';

const copy = testContent.result;

function sameLocalDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/** "Result · Today, 8:41 PM · Frankfurt server"; parts drop out when unknown. */
export function resultEyebrow(result: SpeedTestResult, now: number): string {
  const clock = formatClock(result.finishedAt);
  const when = sameLocalDay(result.finishedAt, now)
    ? `${copy.today}, ${clock}`
    : clock;
  const parts = [copy.eyebrow, when];
  if (result.server.city) {
    parts.push(copy.server(result.server.city));
  }
  return parts.join(copy.separator);
}
