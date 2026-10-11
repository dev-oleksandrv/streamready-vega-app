const DASH = '—';

/**
 * Bits per second → the Mbps value the UI shows: whole numbers from 100 up,
 * one decimal below. Expects a finite, non-negative value.
 */
export function roundMbps(bps: number): number {
  const mbps = bps / 1e6;
  // Round to one decimal first so 99.95 becomes 100, not 100.0.
  const oneDecimal = Math.round(mbps * 10) / 10;
  return oneDecimal >= 100 ? Math.round(mbps) : oneDecimal;
}

/** Bits per second → Mbps text: whole numbers from 100 up, one decimal below. */
export function formatMbps(bps: number): string {
  if (!Number.isFinite(bps) || bps < 0) {
    return DASH;
  }
  const value = roundMbps(bps);
  return value >= 100 ? value.toString() : value.toFixed(1);
}

export function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return DASH;
  }
  return Math.round(ms).toString();
}

/** Seconds → "m:ss". Partial seconds round up so the countdown never shows 0:00 early. */
export function formatCountdown(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

/** Epoch ms → local "8:41 PM". Manual: Intl support on Vega's Hermes is unverified. */
export function formatClock(ms: number): string {
  const date = new Date(ms);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const suffix = hours < 12 ? 'AM' : 'PM';
  return `${hours % 12 || 12}:${minutes} ${suffix}`;
}
