import {useEffect, useState} from 'react';

import {COOLDOWN_MS} from '../config/app';

const TICK_MS = 1000;

/** Whole seconds left, rounded up so the countdown never shows 0 early. */
export function cooldownSeconds(
  cooldownUntil: number | undefined,
  now: number,
): number {
  return cooldownUntil === undefined
    ? 0
    : Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
}

/**
 * Drops a cooldown that ends more than COOLDOWN_MS from now: the wall clock
 * went back (e.g. an NTP correction after boot), and Start must not stay
 * blocked for the size of the jump.
 */
export function boundedCooldown(
  cooldownUntil: number | undefined,
  now: number,
): number | undefined {
  return cooldownUntil !== undefined && cooldownUntil - now > COOLDOWN_MS
    ? undefined
    : cooldownUntil;
}

/**
 * `Date.now()`, refreshed at 1 Hz only while a (bounded) cooldown runs and the
 * screen is active; a hidden Home doesn't re-render every second.
 */
export function useCooldownClock(
  cooldownUntil?: number,
  active = true,
): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const start = Date.now();
    setNow(start);
    const until = boundedCooldown(cooldownUntil, start);
    if (!active || until === undefined || start >= until) {
      return;
    }
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) {
        clearInterval(timer);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [cooldownUntil, active]);
  return now;
}
