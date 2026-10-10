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
export const DEVICE_PROFILES: Readonly<Record<string, DeviceProfile>> = {
  // Dual-band Wi‑Fi 5 (802.11ac); codename observed in device QA 2026-10-10.
  AFTCA002: {name: 'Fire TV Stick 4K Select', wifi: 'Wi‑Fi 5', limitMbps: 300},
};

export function deviceProfile(
  model?: string,
  profiles: Readonly<Record<string, DeviceProfile>> = DEVICE_PROFILES,
): DeviceProfile | undefined {
  return model ? profiles[model] : undefined;
}
