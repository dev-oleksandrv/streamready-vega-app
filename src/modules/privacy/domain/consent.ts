export type ConsentStatus = 'pending' | 'accepted' | 'withdrawn';

/** `gate`: cold-start modal (Accept only). `view`: opened from Home (Back + toggle). */
export type PrivacyMode = 'gate' | 'view';

const STATUSES: readonly ConsentStatus[] = ['pending', 'accepted', 'withdrawn'];

export function isConsentGiven(status: ConsentStatus): boolean {
  return status === 'accepted';
}

/** Reads `{status}` from persisted data; anything unexpected means `pending`. */
export function parseConsentStatus(value: unknown): ConsentStatus {
  if (typeof value !== 'object' || value === null || !('status' in value)) {
    return 'pending';
  }
  const {status} = value as {status: unknown};
  return STATUSES.find((s) => s === status) ?? 'pending';
}
