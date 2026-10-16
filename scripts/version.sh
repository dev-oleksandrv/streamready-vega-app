#!/usr/bin/env bash
# Applies the next release to the version files. The changesets action runs it to build the Version PR.
# `changeset version` only knows package.json and CHANGELOG.md, so this script carries the new version
# into manifest.toml and src/app/config/app.ts, and raises metadata.build_number: every Appstore
# upload needs a new one.
#
# Usage: scripts/version.sh [--build-only]
#   --build-only  raise metadata.build_number only, for resubmitting the same version

set -euo pipefail

cd "$(dirname "$0")/.."

BUILD_ONLY=false

while [ $# -gt 0 ]; do
  case "$1" in
    --build-only)
      BUILD_ONLY=true
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

if [ "$BUILD_ONLY" = false ]; then
  compgen -G ".changeset/*.md" | grep -qv '^.changeset/README.md$' || {
    echo "version: no changesets to release" >&2
    exit 1
  }
  BEFORE=$(node -p 'require("./package.json").version')
  pnpm exec changeset version
  # Empty changesets bump nothing: the PR then only clears them, with no new build.
  if [ "$(node -p 'require("./package.json").version')" = "$BEFORE" ]; then
    echo "version: no release, $BEFORE unchanged"
    exit 0
  fi
fi

node -e '
  const fs = require("fs");
  const buildOnly = process.argv[1] === "true";
  const replace = (file, pattern, value) => {
    const text = fs.readFileSync(file, "utf8");
    if (!pattern.test(text)) throw new Error(`version not found in ${file}`);
    fs.writeFileSync(file, text.replace(pattern, value));
  };

  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  pkg.metadata.build_number += 1;
  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

  if (!buildOnly) {
    replace("manifest.toml", /^version = ".*"$/m, `version = "${pkg.version}"`);
    replace("src/app/config/app.ts", /^export const APP_VERSION = .*;$/m, `export const APP_VERSION = '\''${pkg.version}'\'';`);
  }
  console.log(`${pkg.version} (build ${pkg.metadata.build_number})`);
' "$BUILD_ONLY"
