import type {LagGrade, Outcome, StreamCheckId} from './domain/evaluate';

// Non-breaking hyphen in "Wi‑Fi", as in the design.
const WEAK_WIFI = 'Your Wi‑Fi is overloaded or too weak where the TV is.';

const outcomes: Readonly<Record<Outcome, {headline: string; sub: string}>> = {
  twoUhd: {
    headline: 'Ready for 4K.',
    sub: 'Two 4K streams at once, no buffering expected. Your connection is in great shape.',
  },
  oneUhd: {
    headline: 'Ready for 4K.',
    sub: 'One 4K stream runs smoothly. A second 4K TV at the same time may buffer.',
  },
  laggy: {
    headline: 'Fast, but laggy.',
    sub: 'Speed is enough for 4K, but delay spikes when your network is busy. That can still cause stalls — see Why it lags.',
  },
  limited: {
    headline: 'Full HD, yes. 4K may buffer.',
    sub: 'Speed is enough for 1080p. For 4K, move the stick closer to the router or switch to 5 GHz.',
  },
  hdOnly: {
    headline: 'HD only. Full HD may buffer.',
    sub: `Only HD is likely to play smoothly. ${WEAK_WIFI}`,
  },
  buffering: {
    headline: 'Streaming will buffer.',
    sub: `Even HD needs more. ${WEAK_WIFI}`,
  },
};

const checks: Readonly<Record<StreamCheckId, string>> = {
  hd: 'HD 720p',
  fhd: 'Full HD 1080p',
  uhd: '4K Ultra HD',
  uhd2x: 'Two 4K TVs at once',
};

const LATENCY_LINE: Readonly<Record<LagGrade, string>> = {
  A: 'Smooth, even when busy.',
  B: 'Smooth, even when busy.',
  C: 'Lag spikes when busy.',
  D: 'This is why it stalls.',
  F: 'This is why it stalls.',
};

export const verdictContent = {
  outcomes,
  checks,
  needs: (mbps: number) => `Needs ${mbps} Mbps`,
  latencyHeadline: (grade: LagGrade) =>
    `Grade ${grade}. ${LATENCY_LINE[grade]}`,
} as const;
