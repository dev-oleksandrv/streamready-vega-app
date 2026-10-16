/** Design px scrolled per ▲/▼ press (matches the design prototype). */
export const SCROLL_STEP = 220;

const KEY_UP = 1;

/** The fields of a Vega `HWEvent` this module reads. */
export interface DpadEvent {
  eventType: string;
  eventKeyAction?: number;
}

interface ScrollStepArgs {
  event: DpadEvent;
  offset: number;
  step: number;
  max: number;
}

/** Next scroll offset for a D-pad event, or null when nothing should move. */
export function nextScrollOffset({
  event,
  offset,
  step,
  max,
}: ScrollStepArgs): number | null {
  // Vega emits key-down and key-up; act on the press only.
  if (event.eventKeyAction === KEY_UP) {
    return null;
  }
  const direction =
    event.eventType === 'down' ? 1 : event.eventType === 'up' ? -1 : 0;
  if (direction === 0) {
    return null;
  }
  const next = Math.min(
    Math.max(0, max),
    Math.max(0, offset + direction * step),
  );
  return next === offset ? null : next;
}
