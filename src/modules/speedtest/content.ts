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
  result: {
    eyebrow: 'Result',
    today: 'Today',
    separator: ' · ',
    server: (city: string) => `${city} server`,
    download: 'Download',
    upload: 'Upload',
    ping: 'Ping',
    grade: 'Lag grade',
    msIdle: 'ms idle',
    loaded: (ms: string) => `${ms} ms loaded`,
    // Non-breaking hyphen, as in the design.
    nearLimit: (mbps: number) =>
      `Near your stick's Wi‑Fi limit (~${mbps} Mbps)`,
    testAgain: 'Test again',
    testAgainIn: (seconds: number) => `Test again in ${seconds}s`,
    back: 'Back',
    whyItLags: 'Why it lags',
  },
  latency: {
    eyebrow: 'Latency under load',
    body: 'When your network is busy, delay can spike even if speed looks fine. That spike is what makes video stall and apps feel slow.',
    idle: 'Idle',
    loaded: 'While downloading',
    smooth: 'Smooth',
    stalls: 'Frequent stalls',
    back: 'Back to result',
  },
  retry: 'Try again',
  home: 'Back to home',
  waiting: 'Waiting for connection…',
} as const;
