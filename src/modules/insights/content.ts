export const insightsContent = {
  system: 'Vega OS',
  separator: ' · ',
  unknownValue: '—',
  vpnOn: 'VPN on',
  network: {
    offline: 'Offline',
    wifi: 'Wi‑Fi',
    ethernet: 'Ethernet',
    connected: 'Connected',
    band: (band: string) => `${band} GHz`,
  },
  limit: (mbps: number) => `~${mbps} Mbps`,
  device: {
    eyebrow: 'Device & connection',
    headline: "You're on Vega OS.",
    subKnown: (limitMbps: number) =>
      `Your stick's Wi‑Fi tops out around ${limitMbps} Mbps. If you pay for faster internet, the stick — not your provider — sets the limit.`,
    subUnknown: 'These details help explain your speed test results.',
    back: 'Back',
    rows: {
      model: 'Model',
      system: 'System',
      connection: 'Connection',
      ip: 'Public IP',
      country: 'Country',
      provider: 'Provider',
      limit: 'Device limit',
      appVersion: 'App version',
    },
  },
} as const;
