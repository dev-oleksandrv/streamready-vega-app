import {fetchJson, HttpError} from '~/shared/lib/http';

import type {ServerInfo} from '../../domain/engine';
import {SpeedTestError} from '../../domain/errors';
import {
  CLIENT_NAME,
  DOWNLOAD_URL_KEY,
  LOCATE_TIMEOUT_MS,
  LOCATE_URL,
  UPLOAD_URL_KEY,
} from './protocol';

export interface Ndt7Target {
  server: ServerInfo;
  /** Signed: carries an access token. Never log. */
  downloadUrl: string;
  /** Signed: carries an access token. Never log. */
  uploadUrl: string;
}

export interface LocateOptions {
  fetch: typeof fetch;
  clientVersion: string;
  signal: AbortSignal;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

function toTarget(entry: unknown): Ndt7Target | undefined {
  if (!isRecord(entry) || !isRecord(entry.urls)) {
    return undefined;
  }
  const machine = nonEmptyString(entry.machine);
  const downloadUrl = nonEmptyString(entry.urls[DOWNLOAD_URL_KEY]);
  const uploadUrl = nonEmptyString(entry.urls[UPLOAD_URL_KEY]);
  if (!machine || !downloadUrl || !uploadUrl) {
    return undefined;
  }
  const location = isRecord(entry.location) ? entry.location : {};
  const server: ServerInfo = {machine};
  const city = nonEmptyString(location.city);
  const country = nonEmptyString(location.country);
  if (city) {
    server.city = city;
  }
  if (country) {
    server.country = country;
  }
  return {server, downloadUrl, uploadUrl};
}

export async function locate({
  fetch: fetchFn,
  clientVersion,
  signal,
}: LocateOptions): Promise<Ndt7Target[]> {
  const url = `${LOCATE_URL}?client_name=${CLIENT_NAME}&client_version=${encodeURIComponent(
    clientVersion,
  )}`;
  let body: unknown;
  try {
    body = await fetchJson<unknown>(url, {
      timeoutMs: LOCATE_TIMEOUT_MS,
      signal,
      fetchFn,
    });
  } catch (error) {
    if (error instanceof HttpError && error.kind === 'aborted') {
      throw new SpeedTestError('aborted');
    }
    throw new SpeedTestError('locate_failed');
  }
  if (!isRecord(body)) {
    throw new SpeedTestError('locate_failed');
  }
  const results = Array.isArray(body.results) ? body.results : [];
  const targets = results
    .map(toTarget)
    .filter((t): t is Ndt7Target => t !== undefined);
  if (targets.length === 0) {
    throw new SpeedTestError('no_servers');
  }
  return targets;
}
