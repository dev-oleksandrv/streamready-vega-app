import {LAG_GRADE_ORDER, type LagGrade} from '~/modules/verdict';

/** Only the latest results are kept, as the History screen says. */
export const HISTORY_LIMIT = 50;

/** Matches the insights module's VPN status, stored as it was at the run. */
export type HistoryVpn = 'unknown' | 'off' | 'on';

/** One finished test, as it was shown. Units: bits/s and ms. */
export interface HistoryEntry {
  /** Epoch ms; also the entry's identity (runs are at least a cooldown apart). */
  finishedAt: number;
  downloadBps: number;
  uploadBps: number;
  idleLatencyMs: number;
  loadedLatencyMs: number;
  grade: LagGrade;
  vpn: HistoryVpn;
  /** Geo insights at the run; absent when the lookup had failed. */
  ip?: string;
  countryCode?: string;
  country?: string;
}

export interface HistoryData {
  /** Off: new results are not saved; saved ones stay. */
  enabled: boolean;
  /** Newest first, at most HISTORY_LIMIT. */
  entries: readonly HistoryEntry[];
}

export const EMPTY_HISTORY: HistoryData = {enabled: true, entries: []};

const VPN_STATES: readonly HistoryVpn[] = ['unknown', 'off', 'on'];

export function addEntry(
  entries: readonly HistoryEntry[],
  entry: HistoryEntry,
): readonly HistoryEntry[] {
  return [entry, ...entries].slice(0, HISTORY_LIMIT);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function optionalText(value: unknown): string | undefined | null {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'string' ? value : null;
}

function parseEntry(raw: unknown): HistoryEntry | null {
  if (!isRecord(raw)) {
    return null;
  }
  const {finishedAt, downloadBps, uploadBps, idleLatencyMs, loadedLatencyMs} =
    raw;
  const grade = LAG_GRADE_ORDER.find((g) => g === raw.grade);
  const vpn = VPN_STATES.find((v) => v === raw.vpn);
  const ip = optionalText(raw.ip);
  const countryCode = optionalText(raw.countryCode);
  const country = optionalText(raw.country);
  if (
    !isAmount(finishedAt) ||
    !isAmount(downloadBps) ||
    !isAmount(uploadBps) ||
    !isAmount(idleLatencyMs) ||
    !isAmount(loadedLatencyMs) ||
    grade === undefined ||
    vpn === undefined ||
    ip === null ||
    countryCode === null ||
    country === null
  ) {
    return null;
  }
  // Rebuilt field by field, so nothing unknown from disk reaches the UI.
  const entry: HistoryEntry = {
    finishedAt,
    downloadBps,
    uploadBps,
    idleLatencyMs,
    loadedLatencyMs,
    grade,
    vpn,
  };
  if (ip !== undefined) {
    entry.ip = ip;
  }
  if (countryCode !== undefined) {
    entry.countryCode = countryCode;
  }
  if (country !== undefined) {
    entry.country = country;
  }
  return entry;
}

/** Never trust disk: bad entries are dropped, a bad shape is an empty history. */
export function parseHistory(raw: unknown): HistoryData {
  if (!isRecord(raw)) {
    return EMPTY_HISTORY;
  }
  const list = Array.isArray(raw.entries) ? raw.entries : [];
  const entries = list
    .map(parseEntry)
    .filter((e): e is HistoryEntry => e !== null)
    .sort((a, b) => b.finishedAt - a.finishedAt)
    .slice(0, HISTORY_LIMIT);
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    entries,
  };
}
