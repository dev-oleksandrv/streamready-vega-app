import {HttpError} from '~/shared/lib/http';

// Provider bodies are untrusted: every field is checked, and failures carry no data.

export function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError('parse');
  }
  return body as Record<string, unknown>;
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function requireString(value: unknown): string {
  const text = optionalString(value);
  if (text === undefined) {
    throw new HttpError('parse');
  }
  return text;
}

export function requireCountryCode(value: unknown): string {
  const code = requireString(value);
  if (!/^[A-Za-z]{2}$/.test(code)) {
    throw new HttpError('parse');
  }
  return code.toUpperCase();
}

/** "AS15169 Google LLC" → "Google LLC". */
export function stripAsn(org?: string): string | undefined {
  return optionalString(org?.replace(/^AS\d+\s+/i, ''));
}

export interface ProviderOptions {
  timeoutMs: number;
  fetchFn?: typeof fetch;
}
