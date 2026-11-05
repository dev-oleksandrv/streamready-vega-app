import type {MediaFile} from './types';

/** Lowest resolution the player prefers before it trades quality for a smaller bitrate. */
const MIN_PREFERRED_HEIGHT = 720;

/** The ad may use at most half the measured speed, so it starts without stalling. */
const BANDWIDTH_SHARE = 0.5;

/** Progressive MP4 over http(s): DRM-free and playable without the secure decoder. */
export function isUsableMediaFile(file: MediaFile): boolean {
  return (
    file.type.toLowerCase() === 'video/mp4' &&
    file.delivery === 'progressive' &&
    file.width > 0 &&
    file.height > 0 &&
    /^https?:\/\//i.test(file.uri)
  );
}

export interface MediaFileLimits {
  maxWidth: number;
  maxHeight: number;
  /** The result's download speed, bits/s. */
  downloadBps: number;
}

const area = (f: MediaFile) => f.width * f.height;
const bitrate = (f: MediaFile) => f.bitrateKbps ?? Number.POSITIVE_INFINITY;

/**
 * The smallest file of at least 720p that fits the screen and half the measured speed;
 * otherwise the lowest-bitrate file that fits the screen; otherwise none.
 */
export function pickMediaFile(
  files: readonly MediaFile[],
  {maxWidth, maxHeight, downloadBps}: MediaFileLimits,
): MediaFile | undefined {
  const fitting = files.filter(
    (f) => isUsableMediaFile(f) && f.width <= maxWidth && f.height <= maxHeight,
  );
  const preferred = fitting
    .filter(
      (f) =>
        f.height >= MIN_PREFERRED_HEIGHT &&
        f.bitrateKbps !== undefined &&
        f.bitrateKbps * 1000 <= BANDWIDTH_SHARE * downloadBps,
    )
    .sort((a, b) => area(a) - area(b) || bitrate(a) - bitrate(b));
  if (preferred[0]) {
    return preferred[0];
  }
  return [...fitting].sort(
    (a, b) => bitrate(a) - bitrate(b) || area(a) - area(b),
  )[0];
}
