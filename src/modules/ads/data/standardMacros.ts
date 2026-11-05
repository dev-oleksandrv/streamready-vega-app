import type {MacroValues} from '../domain/macros';

/** The IAB macros every request and beacon gets: an 8-digit cache buster and an ISO 8601 time. */
export function standardMacros(now: number, random: () => number): MacroValues {
  return {
    CACHEBUSTING: String(Math.floor(random() * 1e8)).padStart(8, '0'),
    TIMESTAMP: new Date(now).toISOString(),
  };
}
