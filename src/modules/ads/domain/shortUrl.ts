/** Longer URLs don't fit the card's single line. */
const MAX_LENGTH = 40;

/**
 * The short URL printed under a QR code. It comes only from the ad's own
 * <DisplayUrl> extension: click-through URLs are usually tracking redirects.
 */
export function displayUrl(raw: string | undefined): string | undefined {
  const shown = (raw ?? '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '');
  if (shown === '' || /\s/.test(shown) || shown.length > MAX_LENGTH) {
    return undefined;
  }
  return shown;
}
