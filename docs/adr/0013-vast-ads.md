# 0013. Ads from a VAST ad server

- Status: Accepted
- Date: 2026-11-05

## Context

StreamReady is free and has no other income. Ads can pay for it, but the platform and the app limit how:

- Vega OS has no Amazon banner or display SDK. On TV, programmatic demand is almost all video. Video ads on Vega are client-side: the app plays the ad itself with `@amazon-devices/react-native-w3cmedia`. The stick has one secure decoder, so ad media must be DRM-free (progressive MP4 is), and only 1 GB of RAM.
- Amazon Appstore policy: no ads on exit, on the Fire TV home or in notifications; ads must not look like app UI or invite accidental clicks; interstitials must be closable within 15 s; in-stream video at natural breaks is fine. The listing has to say "Contains ads".
- The app is open source. Anything bundled into the `.vpkg` can be extracted, and anyone must be able to build it.
- The app measures the network. Ad traffic during a test would distort the result.
- Users have consented to a policy that says the app shows no ads (ADR 0005).

## Decision

- **One ad server, spoken to via VAST** (IAB VAST 2, 3 and 4 XML) for every slot. No JSON house feed, no Amazon Publisher Services, no WebView or HTML ads. A new `ads` module owns it: a pure `domain/` (VAST parsing with `fast-xml-parser`, creative rules, macros, media file choice, the video cap) and a `data/` layer (`vastClient` follows up to 3 wrappers within 1.5 s per hop and 3 s in total; `tracker` fires impression, tracking and error beacons, fire-and-forget).
- **Three slots:**
  - a sponsor card on the Result screen, not focusable;
  - a sponsor strip on Home that opens a Sponsor detail screen;
  - a full-screen video when the user leaves a result with Back: at most 30 s, skippable after 5 s, only after a `good` result, only once fully buffered, and at most once per 30 minutes counted from when the last one started.
  Card slots take a NonLinear or Companion static image; the video slot takes a progressive MP4 Linear ad. Anything else is "no fill", reported to the ad server with the matching VAST error code. Empty is normal and silent: the screen looks exactly as it does without ads.
- **Contextual only.** The only result data sent is a category (`good`, `laggy`, `limited`, from the verdict outcome) as the `[SR_CATEGORY]` macro, plus screen size and app id/version. Speeds, connection details, history and the device model never leave the TV. The Advertising ID is not read (`kepler-adid-retriever` is not used); nothing is personalised.
- **Build-time tags.** `scripts/ad-config.mjs` reads `SR_AD_TAG_RESULT`, `SR_AD_TAG_HOME` and `SR_AD_TAG_VIDEO` from `.env` or the environment and writes the gitignored `src/app/config/adConfig.generated.ts` on install, before typecheck and before every build. No tag (or a non-`https://` one) switches that slot off, so a build without tags is an ad-free app. The script never prints tag values.
- **No ad traffic during a test.** While the session is `running`, no ad request, beacon or video buffering happens; in-flight work is aborted. Ad requests come only from the Result and Home routes.
- **One consent switch.** The consent that allows tests and lookups also allows ads, and the privacy policy describes ads. Consent stores a policy version: when the policy changes, users who accepted an older version see the Privacy gate once more.
- Tag and tracker URLs may identify the ad account: like M-Lab's `access_token` URLs, they never appear in logs, error messages or test fixtures.
- The last video's start time is persisted in MMKV under `streamready.ads`, so a restart doesn't reset the 30-minute cap.

## Consequences

- The card slots fill only with campaigns the maintainer traffics directly in the ad server as static-image NonLinear or Companion creatives, targeted on `SR_CATEGORY`. Video can use any VAST demand.
- Tag URLs are extractable from the `.vpkg`. They are client-side identifiers by nature; nothing with admin or billing access may go in `.env`.
- New runtime dependencies: `fast-xml-parser` (pure JS), `qrcode-generator` (pure JS) and `@amazon-devices/react-native-w3cmedia` with its manifest entries.
- The privacy policy gains an Ads section and names the ad service; every existing user is asked to accept it once.
- The Appstore listing must be switched to "Contains ads" before the first release with tags.
- Work lands in three steps: this foundation (no visible change), then the cards with the privacy update, then the video. The release waits until all three are merged, because the updated policy already describes the video.
