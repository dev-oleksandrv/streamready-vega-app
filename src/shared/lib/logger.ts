type Level = 'debug' | 'info' | 'warn' | 'error';
type Sink = Pick<Console, Level>;

export type Logger = Record<Level, (...args: unknown[]) => void>;

export interface LoggerOptions {
  /** Defaults to `__DEV__`: release builds stay silent. */
  enabled?: boolean;
  sink?: Sink;
}

const TOKEN_PATTERN = /(access_token=)[^&\s"']+/g;

/** M-Lab URLs carry signed tokens; they must never reach the logs. */
export function redact(text: string): string {
  return text.replace(TOKEN_PATTERN, '$1***');
}

function sanitize(arg: unknown): unknown {
  if (typeof arg === 'string') {
    return redact(arg);
  }
  if (arg instanceof Error) {
    return redact(`${arg.name}: ${arg.message}`);
  }
  return arg;
}

export function createLogger(scope: string, opts: LoggerOptions = {}): Logger {
  const enabled = opts.enabled ?? __DEV__;
  const sink = opts.sink ?? console;
  const emit =
    (level: Level) =>
    (...args: unknown[]) => {
      if (enabled) {
        sink[level](`[${scope}]`, ...args.map(sanitize));
      }
    };
  return {
    debug: emit('debug'),
    info: emit('info'),
    warn: emit('warn'),
    error: emit('error'),
  };
}
