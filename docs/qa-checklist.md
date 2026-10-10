# QA checklist (on device)

Run the relevant sections on a real Fire TV stick before merging UI or measurement changes.

## Cold start

- [ ] Fresh install shows the splash, then the Privacy modal.
- [ ] Relaunch with consent accepted goes from the splash straight to Home, with insights in the header.
- [ ] Relaunch with consent withdrawn shows the Privacy modal again.
- [ ] With the network off and consent accepted, the splash hides within about 5s and Home shows without insights.

## Consent

- [ ] Accept shows a loader in the button, then goes to Home.
- [ ] Back on the cold-start Privacy gate exits the app.
- [ ] Withdraw hides the header country and IP, and the Device screen's Public IP and Country rows.
- [ ] Withdraw disables Start with the hint "Privacy consent withdrawn".
- [ ] Giving consent again restores insights right away.
- [ ] If the geo lookup fails (block `ipinfo.io` and `get.geojs.io`), no geo insights are rendered anywhere.

## D-pad focus

Initial focus on each screen:

- [ ] Home: Start
- [ ] Result: Test again
- [ ] Privacy: Accept when pending, Back when decided
- [ ] Stop dialog: Keep testing
- [ ] Error overlay: Try again

Other focus checks:

- [ ] Every action on every screen can be reached with the arrows.
- [ ] Disabled Start (offline, withdrawn consent, cooldown) can be focused, is greyed out, and does nothing on OK.

## Back key

- [ ] On Test, Back opens the Stop dialog.
- [ ] Back again resumes the test.
- [ ] On the error overlay, Back goes Home.
- [ ] On Result, Back goes Home.
- [ ] On Latency and Device, Back returns to the previous screen.
- [ ] On Home, Back exits the app.

## Test run

- [ ] Stop dialog: "Keep testing" resumes, and "Stop test" returns Home without a result.
- [ ] `connectionLost`: unplug Ethernet or turn off Wi‑Fi during download.
  - [ ] The overlay shows.
  - [ ] Try again stays disabled with "Waiting for connection…" until you're back online.
- [ ] `serversUnavailable`: block `locate.measurementlab.net` and start a test. The overlay shows during "Finding nearest server…".
- [ ] `interrupted`: block the M-Lab server host after Locate succeeds. The overlay shows.
- [ ] A failed test doesn't start the cooldown.
- [ ] A 30s cooldown starts after a successful test, and both Start and Test again show the countdown.

## Accuracy

- [ ] Run 3 tests on the stick and 3 tests of the M-Lab web speed test on a phone on the same network.
  - [ ] Record download, upload and ping for each.
  - [ ] The stick's results are in the same range as the phone's, or close to the device's Wi‑Fi limit, where the "Near your stick's Wi‑Fi limit" note shows.
- [ ] Debug screen (dev builds): run 3 tests with download mode `arraybuffer` and 3 with `blob`. Record download, upload and ping for each and compare with the phone.
- [ ] Debug screen: Stop mid-download and mid-upload shows `aborted`, and a new run starts cleanly.
- [ ] Debug screen: 3 back-to-back runs complete without a crash or growing memory.
- [ ] Debug screen: on the fastest available link, watch memory during download in both modes (Vega performance tools). `arraybuffer` decodes every message on the JS thread; pick the default mode from this.
- [ ] Debug screen: D-pad and Back stay responsive during upload.
- [ ] Debug screen: on the VVD and on the stick, run each upload window from 1 MiB down to 32 KiB. Record upload Mbps, "Upload window used", and any `upload retry` lines in the logs; pick the default window from the largest one that never retries.

## Native engine

- [ ] Debug screen shows `Native module: present` on the VVD and the stick.
- [ ] Engine `native`, on the stick: 5 back-to-back runs complete without a crash (check `vega device copy-logs -a SYSTEM_TOMBSTONE/acr` afterwards).
- [ ] Before Start, leave the debug screen idle for ~10 s and record `JS stall (idle)`: the screen's own baseline at the same 4 Hz re-render.
- [ ] Engine `native`: JS stall (download) max < 100 ms; record max/avg for download and upload, next to the idle baseline.
- [ ] Debug screen: every row, including `Error`, is visible on screen.
- [ ] Engine `native`: 3 runs on the stick vs 3 M-Lab runs on a phone on the same network; download, upload and ping in the same range.
- [ ] Engine `native`: Stop mid-download and mid-upload shows `aborted`; the next run starts cleanly.
- [ ] Engine `auto` with outbound port 80 blocked (router or proxy): the run falls back and `Engine used` shows `ndt7`.
- [ ] Memory stays flat across 5 native runs (Vega performance tools).
- [ ] D-pad and Back stay responsive during native download and upload.
- [ ] Same checks on the VVD.

## Performance

- [ ] The live value and bars update smoothly, with no visible jank during the test.
- [ ] Memory stays flat during upload (check with the Vega performance tools).
- [ ] D-pad input stays responsive while a test runs.

## Privacy screen

- [ ] Home: the Privacy Policy card has initial focus and opens Privacy.
- [ ] Privacy (view): Back has initial focus; ◀ ▶ moves between Back and Withdraw/Give consent.
- [ ] ▲ ▼ scrolls the policy one step per press, stops at the top and bottom, and never moves focus.
- [ ] Withdraw changes the status to "Consent withdrawn · speed tests are off"; Give consent restores "Consent given".
- [ ] Consent state survives killing and relaunching the app.
- [ ] Back on Privacy (view) returns Home.
- [ ] After returning Home from Privacy, focus lands on the Privacy Policy card (not lost).
- [ ] Geist and Geist Mono render (compare the policy numbers and headlines with the design). If the system font shows, fix the family names in `src/shared/ui/fonts.ts`.
