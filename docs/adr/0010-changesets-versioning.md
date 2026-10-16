# 0010. Changesets for versioning and release notes

- Status: Accepted
- Date: 2026-10-16

## Context

`scripts/release.sh` used to pick the version bump through a prompt at release time. The app had no changelog, so release notes for the Appstore's "What's new" field had to be written from memory. Conventional Commit subjects describe code (`refactor(ndt7): ...`), not what a TV user notices, so a changelog generated from commits would not work as store copy.

The release build needs the Vega SDK, which only the maintainer's machine has. CI cannot build or upload a VPKG.

## Decision

- Use `@changesets/cli` 3. Each branch with a user-facing change adds a `.changeset/*.md` file that names the bump and gives a plain-language summary. Changes with nothing to announce add an empty changeset.
- The package is `private`, and changesets 3 skips private packages by default, so `.changeset/config.json` sets `privatePackages.version: true`. `privatePackages.tag` stays `false`, because the release tag is `v<version>+<build>`.
- `changedFilePatterns` limits the changeset check to app files (`src/`, `kepler/`, `assets/`, `manifest.toml`, `CMakeLists.txt`). Docs, CI and tooling changes need none. The CI job fails a pull request that changes app files without a changeset.
- On each push to `main`, the Version workflow runs `changesets/action` v2 to keep one Version PR open on `changeset-release/main`. Its version script, `scripts/version.sh`, runs `changeset version`, then copies the version into `manifest.toml` and `APP_VERSION`, and raises `metadata.build_number`. Merging the Version PR is the release decision.
- The action authenticates with a fine-grained personal access token (`CHANGESETS_TOKEN`, Contents and Pull requests read/write on this repository only). A PR opened with the default `GITHUB_TOKEN` does not trigger other workflows, so the Version PR would never get CI checks, and `/ship` merges only on green CI.
- `scripts/release.sh` no longer changes the version. On an up-to-date `main` it refuses to run while releasable changesets are pending. Otherwise it builds, verifies the VPKGs, tags the commit and prints the version's `CHANGELOG.md` section as store notes. `--rebuild` opens a branch that only raises the build number, for resubmitting a version the store rejected.
- Default changelog format (`@changesets/cli/changelog`). `@changesets/changelog-github` adds PR links that the store notes would have to strip.

## Consequences

- One small file per user-facing pull request. `/ship` drafts it from the diff when it is missing.
- The release notes and the bump are written alongside the change, not at release time.
- The PAT expires and has to be renewed. When it expires, the Version workflow fails and no Version PR appears. Nothing is lost: the changesets wait on `main`.
- The Version PR's title and commit subject are fixed by the action (`chore(app): release next version`). The version is in its diff and in the tag.
- A changeset merged after the Version PR but before `pnpm run release` blocks the release until the next Version PR is merged, so a build never ships a user-facing change that is missing from its changelog.
