/** Where an ad shows: the Result card, the Home strip (+ Sponsor detail) and the full-screen video. */
export type AdSlot = 'result' | 'home' | 'video';

/** Card slots show a static image; the video slot plays a linear ad. */
export type CardSlot = Exclude<AdSlot, 'video'>;

/** The only thing about a result that reaches the ad server (contextual targeting). */
export type AdCategory = 'good' | 'laggy' | 'limited';

/** VAST tag URL per slot; an empty string switches the slot off. */
export type AdTags = Readonly<Record<AdSlot, string>>;

export const TRACKING_EVENTS = [
  'creativeView',
  'start',
  'firstQuartile',
  'midpoint',
  'thirdQuartile',
  'complete',
  'skip',
  'pause',
  'resume',
] as const;

export type TrackingEvent = (typeof TRACKING_EVENTS)[number];

export type Tracking = Partial<Record<TrackingEvent, readonly string[]>>;

export interface MediaFile {
  uri: string;
  /** MIME type, e.g. `video/mp4`. */
  type: string;
  delivery: 'progressive' | 'streaming';
  width: number;
  height: number;
  /** Kbit/s, as VAST states it; absent when the ad server leaves it out. */
  bitrateKbps?: number;
}

export interface AdImage {
  uri: string;
  width: number;
  height: number;
}

/** One ad, validated for a slot, with every tracker of its wrapper chain merged in. */
export interface AdCreative {
  /** VAST Ad@id or Creative@id, else a hash of the content. */
  id: string;
  advertiser?: string;
  /** AdTitle: the headline. Empty only for video, where it isn't shown. */
  title: string;
  description?: string;
  /** Opens on the phone through the QR code; http(s) only. */
  clickThrough?: string;
  /** Short URL printed under the QR code, from the streamready Extension only. */
  displayUrl?: string;
  /** Card slots. */
  image?: AdImage;
  /** Video slot. */
  video?: {mediaFiles: readonly MediaFile[]; durationMs: number};
  impressions: readonly string[];
  errors: readonly string[];
  tracking: Tracking;
}
