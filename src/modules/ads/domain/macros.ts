/** IAB VAST macros the app fills, plus its own SR_* targeting keys. */
export type MacroName =
  | 'CACHEBUSTING'
  | 'TIMESTAMP'
  | 'ERRORCODE'
  | 'SR_CATEGORY'
  | 'SR_WIDTH'
  | 'SR_HEIGHT'
  | 'SR_APP_ID'
  | 'SR_APP_VERSION';

export type MacroValues = Partial<Record<MacroName, string | number>>;

/** Replaces `[NAME]` with the URL-encoded value. Unknown or unset macros stay as they are. */
export function expandMacros(url: string, values: MacroValues): string {
  return url.replace(/\[([A-Z_]+)\]/g, (match, name: string) => {
    const value = values[name as MacroName];
    return value === undefined ? match : encodeURIComponent(String(value));
  });
}
