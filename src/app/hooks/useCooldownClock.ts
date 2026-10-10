import {useEffect, useState} from 'react';

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

/** `Date.now()`, refreshed at 1 Hz only while a cooldown is running. */
export function useCooldownClock(cooldownUntil?: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (cooldownUntil === undefined || Date.now() >= cooldownUntil) {
      return;
    }
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= cooldownUntil) {
        clearInterval(timer);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [cooldownUntil]);
  return now;
}
