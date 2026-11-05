import type {VastErrorCode} from './errors';
import {isUsableMediaFile} from './mediaFile';
import {displayUrl} from './shortUrl';
import {
  TRACKING_EVENTS,
  type AdCreative,
  type AdSlot,
  type Tracking,
  type TrackingEvent,
} from './types';
import type {VastAd, VastDocument, VastImage} from './vast';
import {MAX_VIDEO_MS} from './videoPolicy';

/** Wider images cost memory on the 1 GB stick and add nothing on a 1920 px screen. */
export const MAX_IMAGE_WIDTH = 1920;

export type CreativeOutcome =
  | {ok: true; creative: AdCreative}
  | {ok: false; code: VastErrorCode; errors: readonly string[]};

function mergeTracking(sources: readonly Tracking[]): Tracking {
  const result: Partial<Record<TrackingEvent, readonly string[]>> = {};
  for (const event of TRACKING_EVENTS) {
    const urls = sources.flatMap((t) => t[event] ?? []);
    if (urls.length > 0) {
      result[event] = urls;
    }
  }
  return result;
}

/** The QR code may only ever open a web page. */
function webUrl(url: string | undefined): string | undefined {
  return url && /^https?:\/\/\S+$/i.test(url) ? url : undefined;
}

/** FNV-1a, base 36: a stable id for ads the server didn't name. */
/* eslint-disable no-bitwise -- a hash is bit arithmetic */
function hashId(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `h${hash.toString(36)}`;
}
/* eslint-enable no-bitwise */

function largestImage(images: readonly VastImage[]): VastImage | undefined {
  let best: VastImage | undefined;
  for (const img of images) {
    if (!img.width || !img.height || img.width > MAX_IMAGE_WIDTH) {
      continue;
    }
    if (
      !best ||
      img.width * img.height > (best.width ?? 0) * (best.height ?? 0)
    ) {
      best = img;
    }
  }
  return best;
}

/**
 * Turns a resolved wrapper chain (wrappers first, the InLine last) into a creative for `slot`,
 * with every wrapper's impressions, errors and trackers merged in chain order.
 * Card slots need a static image and a title; the video slot needs a usable MP4 of at most 30 s.
 */
export function toCreative(
  chain: readonly VastDocument[],
  slot: AdSlot,
): CreativeOutcome {
  const ads = chain.flatMap((d) => (d.kind === 'empty' ? [] : [d.ad]));
  const errors = chain.flatMap((d) =>
    d.kind === 'empty' ? d.errors : d.ad.errors,
  );
  const last = chain.at(-1);
  if (last?.kind !== 'inline') {
    return {ok: false, code: 303, errors};
  }
  const outcome =
    slot === 'video' ? videoCreative(last.ad, ads) : cardCreative(last.ad, ads);
  return typeof outcome === 'number'
    ? {ok: false, code: outcome, errors}
    : {ok: true, creative: {...outcome, errors}};
}

type Built = Omit<AdCreative, 'errors'> | VastErrorCode;

function common(ad: VastAd, ads: readonly VastAd[], contentKey: string) {
  return {
    id: ad.id ?? ad.creativeId ?? hashId(`${ad.title ?? ''}|${contentKey}`),
    advertiser: ad.advertiser,
    description: ad.description,
    displayUrl: displayUrl(ad.displayUrl),
    impressions: ads.flatMap((a) => a.impressions),
  };
}

function videoCreative(ad: VastAd, ads: readonly VastAd[]): Built {
  const linear = ad.linear;
  if (!linear) {
    return 201;
  }
  const mediaFiles = linear.mediaFiles.filter(isUsableMediaFile);
  if (mediaFiles.length === 0) {
    return 403;
  }
  if (linear.durationMs === undefined) {
    return 101;
  }
  if (linear.durationMs > MAX_VIDEO_MS) {
    return 202;
  }
  return {
    ...common(ad, ads, mediaFiles[0]?.uri ?? ''),
    title: ad.title ?? '',
    clickThrough: webUrl(linear.clickThrough),
    video: {mediaFiles, durationMs: linear.durationMs},
    tracking: mergeTracking(ads.map((a) => a.linear?.tracking ?? {})),
  };
}

function cardCreative(ad: VastAd, ads: readonly VastAd[]): Built {
  if (ad.images.length === 0) {
    return ad.linear ? 201 : 503;
  }
  const img = largestImage(ad.images);
  if (!img?.width || !img.height) {
    return 503;
  }
  if (!ad.title) {
    return 101;
  }
  return {
    ...common(ad, ads, img.uri),
    title: ad.title,
    clickThrough: webUrl(img.clickThrough),
    image: {uri: img.uri, width: img.width, height: img.height},
    tracking: mergeTracking([
      ...ads.map((a) => a.nonLinearTracking),
      img.tracking,
    ]),
  };
}
