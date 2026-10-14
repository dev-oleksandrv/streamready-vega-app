#!/usr/bin/env bash
# Cuts a store release: version wizard -> check -> bump -> Release build -> verify VPKGs -> branch, commit, tag.
# The Appstore rejects a VPKG without a build number, and Vega only takes it from --build-number,
# so the counter lives in package.json (metadata.build_number) and goes up on every release.
# Run it from a clean, up-to-date main. Nothing is pushed: /ship the branch, then push the tag.
#
# Usage: scripts/release.sh [--bump patch|minor|major|keep]
#   --bump  pick the version bump without the prompt

set -euo pipefail

cd "$(dirname "$0")/.."

VERSION_FILES=(package.json manifest.toml src/app/config/app.ts)
BUMP=""

while [ $# -gt 0 ]; do
  case "$1" in
    --bump)
      BUMP="${2:-}"
      shift 2 || { echo "--bump needs a value" >&2; exit 1; }
      ;;
    -h | --help)
      sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
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

# Prints the version after applying a bump kind (patch|minor|major|keep) to $1.
next_version() {
  node -e '
    const [current, kind] = process.argv.slice(1);
    const [major, minor, patch] = current.split(".").map(Number);
    const next = {
      patch: [major, minor, patch + 1],
      minor: [major, minor + 1, 0],
      major: [major + 1, 0, 0],
      keep: [major, minor, patch],
    }[kind];
    if (!next) process.exit(1);
    console.log(next.join("."));
  ' "$1" "$2"
}

# --- Preflight -------------------------------------------------------------

[ "$(git branch --show-current)" = "main" ] || die "run from main (a release branch is created for you)"
[ -z "$(git status --porcelain)" ] || die "working tree is not clean"

CURRENT_VERSION=$(node -p 'require("./package.json").version')
CURRENT_BUILD=$(node -p 'require("./package.json").metadata.build_number')
[[ "$CURRENT_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "package.json version is not x.y.z: $CURRENT_VERSION"
[[ "$CURRENT_BUILD" =~ ^[0-9]+$ ]] || die "package.json metadata.build_number is not an integer: $CURRENT_BUILD"

# --- Version wizard --------------------------------------------------------

if [ -z "$BUMP" ]; then
  echo "Current: $CURRENT_VERSION (build $CURRENT_BUILD)"
  OPTIONS=()
  for kind in patch minor major keep; do
    OPTIONS+=("$kind -> $(next_version "$CURRENT_VERSION" "$kind")")
  done
  PS3="Choose a bump: "
  select choice in "${OPTIONS[@]}"; do
    [ -n "$choice" ] && BUMP="${choice%% *}" && break
  done
  [ -n "$BUMP" ] || die "no bump chosen"
fi

VERSION=$(next_version "$CURRENT_VERSION" "$BUMP") || die "unknown bump: $BUMP (use patch, minor, major or keep)"
BUILD=$((CURRENT_BUILD + 1))
BRANCH="chore/release-$VERSION"
TAG="v$VERSION+$BUILD"

git show-ref --verify --quiet "refs/heads/$BRANCH" && die "branch $BRANCH already exists"
git show-ref --verify --quiet "refs/tags/$TAG" && die "tag $TAG already exists"

echo "==> Releasing $VERSION (build $BUILD)"

# --- Check -----------------------------------------------------------------

pnpm run check

# --- Bump --------------------------------------------------------------------

# From here on, a failure puts the version files back so a broken build leaves no half-bump behind.
COMMITTED=false
restore_on_failure() {
  if [ "$COMMITTED" = false ]; then
    echo "release: failed, restoring ${VERSION_FILES[*]}" >&2
    git checkout -- "${VERSION_FILES[@]}"
  fi
}
trap restore_on_failure EXIT

node -e '
  const fs = require("fs");
  const [version, build] = process.argv.slice(1);
  const replace = (file, pattern, value) => {
    const text = fs.readFileSync(file, "utf8");
    if (!pattern.test(text)) throw new Error(`version not found in ${file}`);
    fs.writeFileSync(file, text.replace(pattern, value));
  };

  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  pkg.version = version;
  pkg.metadata.build_number = Number(build);
  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

  replace("manifest.toml", /^version = ".*"$/m, `version = "${version}"`);
  replace("src/app/config/app.ts", /^export const APP_VERSION = .*;$/m, `export const APP_VERSION = '\''${version}'\'';`);
' "$VERSION" "$BUILD"

# --- Build -------------------------------------------------------------------

echo "==> Building Release $VERSION (build $BUILD)"
pnpm exec react-native build-vega --build-type Release --build-version "$VERSION" --build-number "$BUILD"

# --- Verify ----------------------------------------------------------------

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

# --- Branch, commit, tag ---------------------------------------------------

git checkout -b "$BRANCH"
git add "${VERSION_FILES[@]}"
git commit -m "chore(app): release $VERSION (build $BUILD)"
COMMITTED=true
git tag -a "$TAG" -m "StreamReady $VERSION (build $BUILD)"

cat <<EOF

Released $VERSION (build $BUILD) on $BRANCH, tagged $TAG.
Upload (x86_64 is for the Vega Virtual Device only):
$(printf '  %s\n' "${VPKGS[@]}" | grep -v x86_64)
Next: /ship the branch, then: git push origin $TAG
EOF
