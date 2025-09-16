#!/usr/bin/env bash
set -euo pipefail

: "${ENTRY?Need ENTRY}" # changelog entry text
: "${VERSION?Need VERSION}" # version string

HEADER_LINE="All notable changes to this project will be documented in this file."

if [ ! -f CHANGELOG.md ] || ! grep -q "^${HEADER_LINE}$" CHANGELOG.md; then
  {
    echo "# Changelog"
    echo
    echo "${HEADER_LINE}"
    echo
  } > CHANGELOG.tmp
  printf "%s\n" "${ENTRY}" >> CHANGELOG.tmp
  [ -f CHANGELOG.md ] && cat CHANGELOG.md >> CHANGELOG.tmp
  mv CHANGELOG.tmp CHANGELOG.md
else
  printf "%s\n" "${ENTRY}" > .changelog_entry
  sed "/^${HEADER_LINE}$/r .changelog_entry" CHANGELOG.md > CHANGELOG.tmp
  rm -f .changelog_entry
  mv CHANGELOG.tmp CHANGELOG.md
fi

git add CHANGELOG.md package.json package-lock.json
git commit -m "chore(release): v${VERSION}"
git tag "v${VERSION}"
