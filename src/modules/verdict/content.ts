import type {LagGrade, Outcome, StreamCheckId} from './domain/evaluate';

// Non-breaking hyphen in "Wi‑Fi", as in the design.
const WEAK_WIFI = 'Your Wi‑Fi is overloaded or too weak where the TV is.';
// Wired or unknown transport: the Wi‑Fi advice would point at the wrong cause.
const WEAK_LINK = 'Your internet plan is too slow or your network is busy.';

interface OutcomeCopy {
  headline: string;
  /** On Wi‑Fi. */
  sub: string;
  /** Not on Wi‑Fi; falls back to `sub` when the advice fits both. */
  subWired?: string;
}

const outcomes: Readonly<Record<Outcome, OutcomeCopy>> = {
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
    subWired:
      'Speed is enough for 1080p. For 4K, pause other downloads on your network or check your internet plan.',
  },
  hdOnly: {
    headline: 'HD only. Full HD may buffer.',
    sub: `Only HD is likely to play smoothly. ${WEAK_WIFI}`,
    subWired: `Only HD is likely to play smoothly. ${WEAK_LINK}`,
  },
  buffering: {
    headline: 'Streaming will buffer.',
    sub: `Even HD needs more. ${WEAK_WIFI}`,
    subWired: `Even HD needs more. ${WEAK_LINK}`,
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
  outcomeSub: (outcome: Outcome, onWifi: boolean): string => {
    const copy = outcomes[outcome];
    return onWifi ? copy.sub : copy.subWired ?? copy.sub;
  },
  checks,
  needs: (mbps: number) => `Needs ${mbps} Mbps`,
  latencyHeadline: (grade: LagGrade) =>
    `Grade ${grade}. ${LATENCY_LINE[grade]}`,
} as const;
