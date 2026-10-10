/** Keep in sync with `version` in manifest.toml; sent to M-Lab as client_version. */
export const APP_VERSION = '0.1.0';

/** Starts after a successful test only. */
export const COOLDOWN_MS = 30_000;

/** One deadline for the whole geo chain: bounds the Accept loader and the cold-start splash. */
export const INSIGHTS_TIMEOUT_MS = 5000;
