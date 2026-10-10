/** Keep in sync with `version` in manifest.toml; sent to M-Lab as client_version. */
export const APP_VERSION = '0.1.0';

/** Starts after a successful test only. */
export const COOLDOWN_MS = 30_000;

/** One deadline for the whole geo chain: bounds the Accept loader and the cold-start splash. */
export const INSIGHTS_TIMEOUT_MS = 5000;

/** Per-provider budget inside that deadline, so a hanging ipinfo still leaves geojs ~2 s. */
export const INSIGHTS_ATTEMPT_MS = 3000;
