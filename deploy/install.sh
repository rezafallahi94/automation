#!/usr/bin/env bash
# Static-only deployment. Requires Bash, coreutils, tar and flock (typical Linux cPanel).
set -Eeuo pipefail
umask 077
fail() { printf 'RABO ERROR: %s\n' "$*" >&2; exit 1; }
for bin in realpath sha256sum flock tar find cp mv mktemp; do command -v "$bin" >/dev/null || fail "Missing command: $bin"; done
CONFIG="${RABO_CONFIG_FILE:-$HOME/.config/rabo-deploy.conf}"
[[ -f "$CONFIG" && ! -L "$CONFIG" ]] || fail "First configure $HOME/.config/rabo-deploy.conf"
# Trusted local administrator configuration; never distributed with the release.
source "$CONFIG"
[[ "${RABO_WEBROOT:-}" = /* && -d "$RABO_WEBROOT" && ! -L "$RABO_WEBROOT" ]] || fail 'Invalid document root'
WEBROOT=$(realpath "$RABO_WEBROOT")
[[ "$WEBROOT" != / && "$WEBROOT" != "$HOME" ]] || fail 'Unsafe document root'
BACKUPS="$HOME/rabo-frontend-backups"
mkdir -p "$BACKUPS"
BACKUPS=$(realpath "$BACKUPS")
[[ "$BACKUPS" != "$WEBROOT" && "$BACKUPS" != "$WEBROOT/"* ]] || fail 'Backups must be outside the website'
exec 9>"$BACKUPS/deployment.lock"
flock -n 9 || fail 'Another deployment is running'
RELEASE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
allowed() {
  local p="$1"
  [[ "$p" =~ ^[A-Za-z0-9_./-]+$ && "$p" != /* && "$p" != *..* && "$p" != *//* ]] || return 1
  case "$p" in
    index.html|manifest.json|sw.js|Logo.svg|Logo-1.svg|logo.svg|rabo-version.json) return 0 ;;
    assets/*|fonts/*) case "$p" in *.js|*.css|*.svg|*.json|*.woff|*.woff2|*.ttf|*.png|*.jpg|*.jpeg|*.webp|*.ico) return 0 ;; esac ;;
  esac
  return 1
}
# Refuse links in the destinations we own; never follow links into user data.
for name in index.html manifest.json sw.js Logo.svg Logo-1.svg logo.svg rabo-version.json assets fonts; do
  [[ ! -L "$WEBROOT/$name" ]] || fail "Symlink in destination: $name"
  if [[ -d "$WEBROOT/$name" ]]; then
    [[ -z "$(find "$WEBROOT/$name" -type l -print -quit)" ]] || fail "Symlink below: $name"
  fi
done
STAGE=$(mktemp -d "$BACKUPS/.stage.XXXXXXXX")
trap 'rm -rf -- "$STAGE"' EXIT
FILES=()
load_release() {
  local root="$1" digest path actual
  [[ -f "$root/SHA256SUMS" && -d "$root/site" && ! -L "$root/site" ]] || fail 'Incomplete release'
  [[ -z "$(find "$root/site" -type l -print -quit)" ]] || fail 'Symlink in release'
  FILES=()
  while read -r digest path; do
    [[ "$digest" =~ ^[a-f0-9]{64}$ ]] || fail 'Invalid checksum manifest'
    allowed "$path" || fail "Forbidden release path: $path"
    [[ -f "$root/site/$path" ]] || fail "Missing file: $path"
    [[ ! -d "$WEBROOT/$path" ]] || fail "Destination file is a directory: $path"
    actual=$(sha256sum "$root/site/$path"); actual=${actual%% *}
    [[ "$actual" == "$digest" ]] || fail "Checksum mismatch: $path"
    mkdir -p "$STAGE/site/$(dirname "$path")"
    cp -- "$root/site/$path" "$STAGE/site/$path"
    chmod 644 "$STAGE/site/$path"
    FILES+=("$path")
  done < "$root/SHA256SUMS"
  [[ -f "$STAGE/site/index.html" ]] || fail 'Missing index.html'
  [[ ${#FILES[@]} -gt 0 ]] || fail 'Empty release'
}
snapshot() {
  local name path digest
  SNAPSHOT="$BACKUPS/$(date -u +%Y%m%dT%H%M%SZ)-$$"
  mkdir -p "$SNAPSHOT/site"
  printf '%s\n' "$WEBROOT" > "$SNAPSHOT/webroot.txt"
  : > "$SNAPSHOT/SHA256SUMS"
  for name in index.html manifest.json sw.js Logo.svg Logo-1.svg logo.svg rabo-version.json assets fonts; do
    if [[ -f "$WEBROOT/$name" ]]; then
      cp -- "$WEBROOT/$name" "$SNAPSHOT/site/$name"
    elif [[ -d "$WEBROOT/$name" ]]; then
      cp -R -- "$WEBROOT/$name" "$SNAPSHOT/site/$name"
    fi
  done
  # CageFS/cPanel may not expose /dev/fd: use a regular private file.
  # Enumerate first so find failures stop deployment before any live write.
  find "$SNAPSHOT/site" -type f -print0 > "$STAGE/snapshot-files"
  while IFS= read -r -d '' path; do
    path=${path#"$SNAPSHOT/site/"}
    allowed "$path" || fail "Unexpected legacy static file: $path"
    digest=$(sha256sum "$SNAPSHOT/site/$path"); digest=${digest%% *}
    printf '%s  %s\n' "$digest" "$path" >> "$SNAPSHOT/SHA256SUMS"
  done < "$STAGE/snapshot-files"
}
# Publish each file via rename in its destination filesystem; switch index last.
publish() {
  local path parent tmp
  for path in "${FILES[@]}"; do
    [[ "$path" != index.html ]] || continue
    parent="$WEBROOT/$(dirname "$path")"
    mkdir -p "$parent"
    # Parent directories need to be readable by the web server despite umask 077.
    local walk="$parent"
    while [[ "$walk" != "$WEBROOT" ]]; do chmod 755 "$walk"; walk=$(dirname "$walk"); done
    tmp=$(mktemp "$parent/.rabo-publish.XXXXXXXX")
    cp -- "$STAGE/site/$path" "$tmp"; chmod 644 "$tmp"; mv -f -- "$tmp" "$WEBROOT/$path"
  done
  tmp=$(mktemp "$WEBROOT/.rabo-publish.XXXXXXXX")
  cp -- "$STAGE/site/index.html" "$tmp"; chmod 644 "$tmp"; mv -f -- "$tmp" "$WEBROOT/index.html"
}
case "${1:-deploy}" in
  deploy)
    load_release "$RELEASE"
    snapshot
    publish
    if [[ -f "$SNAPSHOT/site/index.html" ]]; then
      printf '%s\n' "${SNAPSHOT##*/}" > "$BACKUPS/previous.tmp"
      mv -f "$BACKUPS/previous.tmp" "$BACKUPS/previous"
    fi
    printf 'RABO UPDATE SUCCESS. Frontend snapshot: %s\n' "$SNAPSHOT"
    ;;
  rollback)
    [[ -f "$BACKUPS/previous" ]] || fail 'No previous website snapshot'
    read -r id < "$BACKUPS/previous"
    [[ "$id" =~ ^[0-9]{8}T[0-9]{6}Z-[0-9]+$ ]] || fail 'Invalid snapshot ID'
    [[ -f "$BACKUPS/$id/webroot.txt" && "$(cat "$BACKUPS/$id/webroot.txt")" == "$WEBROOT" ]] || fail 'Snapshot belongs to another document root'
    load_release "$BACKUPS/$id"
    snapshot
    publish
    printf '%s\n' "${SNAPSHOT##*/}" > "$BACKUPS/previous.tmp"
    mv -f "$BACKUPS/previous.tmp" "$BACKUPS/previous"
    for name in manifest.json sw.js Logo.svg Logo-1.svg logo.svg rabo-version.json; do
      [[ -f "$STAGE/site/$name" ]] || rm -f -- "$WEBROOT/$name"
    done
    printf 'RABO ROLLBACK SUCCESS\n' 
    ;;
  *) fail 'Use deploy or rollback' ;;
esac
