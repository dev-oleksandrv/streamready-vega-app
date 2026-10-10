export interface DeviceProfile {
  /** Marketing name, e.g. "Fire TV Stick 4K Select". */
  name: string;
  /** Wi‑Fi generation label, e.g. "Wi‑Fi 5". */
  wifi: string;
  /** Practical Wi‑Fi throughput ceiling. */
  limitMbps: number;
}

/**
 * Keyed by getModel() codename. Vega has no marketing-name API, and no public
 * source lists codenames: add only codenames observed on a device during QA.
 */
export const DEVICE_PROFILES: Readonly<Record<string, DeviceProfile>> = {};

export function deviceProfile(
  model?: string,
  profiles: Readonly<Record<string, DeviceProfile>> = DEVICE_PROFILES,
): DeviceProfile | undefined {
  return model ? profiles[model] : undefined;
}
