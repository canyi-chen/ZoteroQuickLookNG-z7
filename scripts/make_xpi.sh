#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

mkdir -p dist
OUT="dist/ZoteroQuickLookNG-z7-${VERSION}.xpi"
include=(manifest.json bootstrap.js)
for d in content defaults locale chrome resources modules; do
  [[ -e "$d" ]] && include+=("$d")
done
if [[ "${#include[@]}" -eq 2 && ! -e "manifest.json" ]]; then
  echo "No source files found. Create an XPI manually and place it in dist/." >&2
  exit 1
fi
echo "Packing: ${include[*]}"
zip -r "$OUT" "${include[@]}" -x ".git/*" ".github/*" "dist/*" "docs/*" "scripts/*" "*.md"
echo "Wrote $OUT"
