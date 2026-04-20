#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
STAGING_DIR="${DIST_DIR}/package"

required_paths=(
  "manifest.json"
  "index.html"
  "styles.css"
  "script.js"
  "src"
  "_locales"
)

for path in "${required_paths[@]}"; do
  if [[ ! -e "${ROOT_DIR}/${path}" ]]; then
    echo "Missing required path: ${path}" >&2
    exit 1
  fi
done

VERSION="$(
  python3 - <<'PY'
import json
from pathlib import Path

manifest = json.loads(Path("manifest.json").read_text(encoding="utf-8"))
print(manifest["version"])
PY
)"

ARCHIVE_NAME="newbingtab-v${VERSION}.zip"
ARCHIVE_PATH="${DIST_DIR}/${ARCHIVE_NAME}"

rm -rf "${STAGING_DIR}"
mkdir -p "${STAGING_DIR}"

cp "${ROOT_DIR}/manifest.json" "${STAGING_DIR}/"
cp "${ROOT_DIR}/index.html" "${STAGING_DIR}/"
cp "${ROOT_DIR}/styles.css" "${STAGING_DIR}/"
cp "${ROOT_DIR}/script.js" "${STAGING_DIR}/"
cp -R "${ROOT_DIR}/src" "${STAGING_DIR}/"
cp -R "${ROOT_DIR}/_locales" "${STAGING_DIR}/"

rm -f "${ARCHIVE_PATH}"
(
  cd "${STAGING_DIR}"
  zip -r "${ARCHIVE_PATH}" . >/dev/null
)

echo "Created ${ARCHIVE_PATH}"
