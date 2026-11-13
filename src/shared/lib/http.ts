export type HttpErrorKind =
  | 'timeout'
  | 'network'
  | 'status'
  | 'parse'
  | 'aborted';

export class HttpError extends Error {
  readonly kind: HttpErrorKind;
  readonly status?: number;

  constructor(kind: HttpErrorKind, status?: number) {
    // The message never includes the URL: it may carry an access token.
    super(status === undefined ? `http ${kind}` : `http ${kind} ${status}`);
    this.name = 'HttpError';
    this.kind = kind;
    this.status = status;
  }
}

export interface FetchJsonOptions {
  timeoutMs: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  fetchFn?: typeof fetch;
}

export async function fetchJson<T>(
  url: string,
  opts: FetchJsonOptions,
): Promise<T> {
  const {timeoutMs, signal, headers, fetchFn = fetch} = opts;
  if (signal?.aborted) {
    throw new HttpError('aborted');
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener('abort', onCallerAbort);

  try {
    let response: Response;
    try {
      response = await fetchFn(url, {headers, signal: controller.signal});
    } catch {
      if (timedOut) {
        throw new HttpError('timeout');
      }
      if (signal?.aborted) {
        throw new HttpError('aborted');
      }
      throw new HttpError('network');
    }
    if (!response.ok) {
      throw new HttpError('status', response.status);
    }
    try {
      return (await response.json()) as T;
    } catch {
      // The body read is aborted by the same controller as the request.
      if (timedOut) {
        throw new HttpError('timeout');
      }
      if (signal?.aborted) {
        throw new HttpError('aborted');
      }
      throw new HttpError('parse');
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onCallerAbort);
  }
}
