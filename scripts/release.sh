#!/usr/bin/env bash
# Builds and tags the store release that main is at: check -> Release build -> verify VPKGs -> tag -> store notes.
# The version and build number come from package.json. The changesets Version PR sets them
# (scripts/version.sh), so /ship that PR first. Nothing is pushed: push the tag yourself.
#
# Usage: scripts/release.sh [--rebuild]
#   --rebuild  the store rejected the tagged build: open a branch that only raises the build number,
#              /ship it, then run this script again

set -euo pipefail

cd "$(dirname "$0")/.."

REBUILD=false

while [ $# -gt 0 ]; do
  case "$1" in
    --rebuild)
      REBUILD=true
      shift
      ;;
    -h | --help)
      sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

die() {
  echo "release: $*" >&2
  exit 1
}

# --- Preflight -------------------------------------------------------------

[ "$(git branch --show-current)" = "main" ] || die "run from main"
[ -z "$(git status --porcelain)" ] || die "working tree is not clean"
git fetch --quiet origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || die "main is not in sync with origin/main (git pull --ff-only)"

VERSION=$(node -p 'require("./package.json").version')
BUILD=$(node -p 'require("./package.json").metadata.build_number')
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "package.json version is not x.y.z: $VERSION"
[[ "$BUILD" =~ ^[0-9]+$ ]] || die "package.json metadata.build_number is not an integer: $BUILD"
grep -q "^version = \"$VERSION\"$" manifest.toml || die "manifest.toml version does not match package.json $VERSION"
grep -q "^export const APP_VERSION = '$VERSION';$" src/app/config/app.ts || die "src/app/config/app.ts APP_VERSION does not match package.json $VERSION"

TAG="v$VERSION+$BUILD"

# --- Rebuild: new build number for the same version -------------------------

if [ "$REBUILD" = true ]; then
  git show-ref --verify --quiet "refs/tags/$TAG" || die "$TAG is not tagged yet: run without --rebuild"
  NEXT_BUILD=$((BUILD + 1))
  BRANCH="chore/release-$VERSION-build-$NEXT_BUILD"
  git show-ref --verify --quiet "refs/heads/$BRANCH" && die "branch $BRANCH already exists"

  git checkout -b "$BRANCH"
  scripts/version.sh --build-only >/dev/null
  git add package.json
  git commit -m "chore(app): bump build number to $NEXT_BUILD"
  cat <<EOF

Raised the build number to $NEXT_BUILD on $BRANCH.
Next: /ship the branch, then run pnpm run release from main.
EOF
  exit 0
fi

# --- Release ---------------------------------------------------------------

# A merged changeset means main holds work that is not in this version's changelog yet.
PLAN=$(mktemp)
trap 'rm -f "$PLAN"' EXIT
pnpm exec changeset status --output "$PLAN" >/dev/null
node -e '
  const plan = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  if (plan.releases.length > 0) process.exit(1);
' "$PLAN" || die "main has unreleased changesets: /ship the Version PR (changeset-release/main) first"

git show-ref --verify --quiet "refs/tags/$TAG" && die "$TAG is already tagged. To resubmit it, run with --rebuild"

echo "==> Releasing $VERSION (build $BUILD)"

pnpm run check

echo "==> Building Release $VERSION (build $BUILD)"
pnpm exec react-native build-vega --build-type Release --build-version "$VERSION" --build-number "$BUILD"

VPKGS=(build/*-release/*.vpkg)
[ -e "${VPKGS[0]}" ] || die "no Release VPKG found under build/"
for vpkg in "${VPKGS[@]}"; do
  vega exec vpt info "$vpkg" --json | node -e '
    const [vpkg, version, build] = process.argv.slice(1);
    const info = JSON.parse(require("fs").readFileSync(0, "utf8"));
    if (info.version !== version || info.build_number !== Number(build)) {
      console.error(`release: ${vpkg} has ${info.version} (build ${info.build_number}), expected ${version} (build ${build})`);
      process.exit(1);
    }
  ' "$vpkg" "$VERSION" "$BUILD"
  echo "    ok  $vpkg"
done

git tag -a "$TAG" -m "StreamReady $VERSION (build $BUILD)"

# The store's "What's new" field takes plain text: drop the headings and the commit hashes.
NOTES=$(node -e '
  const [version] = process.argv.slice(1);
  const lines = require("fs").readFileSync("CHANGELOG.md", "utf8").split("\n");
  const start = lines.indexOf(`## ${version}`);
  if (start === -1) process.exit(0);
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  lines
    .slice(start + 1, end === -1 ? undefined : end)
    .filter((line) => line.trim() !== "" && !line.startsWith("#"))
    .forEach((line) => console.log(line.replace(/^- [0-9a-f]{7,40}: /, "- ")));
' "$VERSION")

cat <<EOF

Tagged $TAG.
Upload (x86_64 is for the Vega Virtual Device only):
$(printf '  %s\n' "${VPKGS[@]}" | grep -v x86_64)
Store release notes:
${NOTES:-  (no CHANGELOG.md section for $VERSION)}
Next: git push origin $TAG
EOF
