/**
 * The IAB VAST error codes the app reports through `[ERRORCODE]`:
 * 100 XML parsing · 101 schema · 201 linearity mismatch · 202 duration mismatch ·
 * 300 wrapper error · 301 wrapper timeout · 302 wrapper limit · 303 no ad after wrapper / no fill ·
 * 403 no supported media file · 405 media could not play · 503 no supported image ·
 * 603 image could not load · 900 undefined.
 */
export type VastErrorCode =
  | 100
  | 101
  | 201
  | 202
  | 300
  | 301
  | 302
  | 303
  | 403
  | 405
  | 503
  | 603
  | 900;

export class VastError extends Error {
  readonly code: VastErrorCode;

  constructor(code: VastErrorCode) {
    // Never include URLs or the document: tags and trackers identify the ad account.
    super(`vast ${code}`);
    this.name = 'VastError';
    this.code = code;
  }
}
