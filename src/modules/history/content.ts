import {HISTORY_LIMIT} from './domain/entry';

const results = (count: number) =>
  count === 1 ? '1 saved result' : `${count} saved results`;

export const historyContent = {
  eyebrow: 'History',
  headline: 'Your past tests.',
  limitNote: `Only the ${HISTORY_LIMIT} latest results are stored.`,
  count: (count: number) => `${count} of ${HISTORY_LIMIT} saved`,
  scrollKeys: '▲ ▼',
  scrollHint: 'Scroll',
  offNotice: "History is off · new results aren't saved",
  toggle: 'Save history',
  clear: 'Clear history',
  columns: {
    when: 'When',
    download: 'Download',
    upload: 'Upload',
    idle: 'Idle ping',
    loaded: 'Loaded ping',
    grade: 'Grade',
    ip: 'IP address',
    country: 'Country',
    vpn: 'VPN',
  },
  units: {mbps: 'Mbps', ms: 'ms'},
  vpn: {on: 'On', off: 'Off', unknown: '—'},
  noIp: '—',
  noCountryCode: '—',
  noCountry: 'Unknown',
  today: 'Today',
  yesterday: 'Yesterday',
  // Manual: Intl support on Vega's Hermes is unverified.
  months: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  empty: {
    title: 'No results yet.',
    on: 'Run a speed test and your results will show up here.',
    off: 'History is off. Turn it on to keep your results.',
  },
  confirm: {
    title: 'Clear history?',
    body: (count: number) =>
      `${
        count === 1 ? 'Your 1 saved result' : `All ${count} saved results`
      } will be deleted from this TV. This can't be undone.`,
    keep: 'Keep history',
    clear: 'Clear history',
  },
  /** Home card subtitle. */
  summary: {
    off: 'Off',
    empty: 'No results yet',
    results,
  },
} as const;
