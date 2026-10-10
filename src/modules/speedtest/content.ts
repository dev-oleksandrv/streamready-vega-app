export const testContent = {
  empty: '—',
  steps: {ping: 'Ping', download: 'Download', upload: 'Upload'},
  live: {
    locating: 'Finding server',
    latency: 'Measuring ping',
    download: 'Download',
    upload: 'Upload',
    finishing: 'Finishing',
    done: 'Finished',
  },
  units: {mbps: 'Mbps', ms: 'ms'},
  ms: (value: string) => `${value} ms`,
  cards: {loaded: 'Latency under load', idle: 'Idle ping'},
  server: {
    finding: 'Finding nearest server…',
    label: 'Server',
    // Non-breaking hyphen, as in the design.
    provider: 'M‑Lab',
  },
  stop: {
    title: 'Stop the test?',
    body: "Your progress will be lost and you won't get a result.",
    keep: 'Keep testing',
    stop: 'Stop test',
  },
  errors: {
    connectionLost: {
      title: 'Connection lost.',
      body: 'Your TV dropped off the internet during the test. Check your Wi‑Fi or network cable, then try again.',
    },
    serversUnavailable: {
      title: 'Test servers are busy.',
      body: "We couldn't reach a test server right now. This usually clears up in a minute.",
    },
    interrupted: {
      title: "The test didn't finish.",
      body: 'Something interrupted the measurement before we got a reliable result. Running it again usually works.',
    },
  },
  retry: 'Try again',
  home: 'Back to home',
  waiting: 'Waiting for connection…',
} as const;
