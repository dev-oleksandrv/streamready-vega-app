# @voronkov/streamready

User-facing changes in each store release. Entries come from the changesets merged since the previous release (see [CONTRIBUTING.md](CONTRIBUTING.md#changesets)).

## 1.2.0

### Minor Changes

- 865cb11: Back on the home screen now asks before leaving the app, so a stray press of the remote's Back button no longer closes StreamReady.

## 1.1.1

### Patch Changes

- 555af5b: Fixes the Ping, Download and Upload bars showing as full at the start of a second test. They now start empty and fill as each step runs.
- 75c70c7: Fixes the speed chart on the test screen ending short of the right edge. Download now fills the left half and upload the right half, so a finished test spans the full width.

## 1.1.0

### Minor Changes

- b5bfa70: Shows a "VPN on" badge in the header when a VPN is connected on the TV, since a VPN can slow streaming. Ping and lag under a VPN are now measured on the TV, instead of reading near 0 ms.

## 1.0.0

### Major Changes

- First release on the Amazon Appstore.
  - Measures download and upload speed, idle latency and latency under load with M-Lab ndt7.
  - Answers "Will my TV stream in 4K?" with checks for HD 720p, Full HD 1080p, 4K and two 4K TVs at once.
  - Grades latency under load from A to F, the usual cause of buffering on a fast connection.
  - Shows your public IP, country, city and provider, after you agree to the privacy policy.
