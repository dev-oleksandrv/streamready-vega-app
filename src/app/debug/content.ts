// Temporary debug screen copy; removed with the screen when the Test UI lands.
export const debugContent = {
  title: 'Speed test (debug)',
  start: 'Start',
  stop: 'Stop',
  mode: (mode: string) => `Download mode: ${mode}`,
  empty: '—',
  rows: {
    status: 'Status',
    phase: 'Phase',
    server: 'Server',
    download: 'Download',
    upload: 'Upload',
    idle: 'Idle ping',
    loaded: 'Loaded ping',
    elapsed: 'Elapsed',
    error: 'Error',
  },
  mbps: (value: string) => `${value} Mbps`,
  ms: (value: string) => `${value} ms`,
  seconds: (value: string) => `${value} s`,
} as const;
