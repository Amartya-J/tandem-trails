#!/bin/sh
set -eu
cd "$(dirname "$0")"
APP="$HOME/Applications/AutoKeyer Remake.app"
mkdir -p .build/module-cache
mkdir -p "$HOME/Applications"
export CLANG_MODULE_CACHE_PATH="$PWD/.build/module-cache"
SOURCE_HASH="$(shasum -a 256 AutoKeyerRemake.swift Info.plist | shasum -a 256 | awk '{print $1}')"
if [ -d "$APP" ] && [ -f .build/source.sha256 ] && [ "$(cat .build/source.sha256)" = "$SOURCE_HASH" ] && codesign --verify --deep --strict "$APP" >/dev/null 2>&1; then
    printf 'Already built; keeping the existing app and its Accessibility identity: %s\n' "$APP"
    exit 0
fi
STAGING_DIR="$(mktemp -d /private/tmp/autokeyer.XXXXXX)"
trap 'rm -rf "$STAGING_DIR"' EXIT HUP INT TERM
STAGING_APP="$STAGING_DIR/AutoKeyer Remake.app"
mkdir -p "$STAGING_APP/Contents/MacOS"
cp Info.plist "$STAGING_APP/Contents/Info.plist"
swiftc -O -parse-as-library -module-cache-path "$PWD/.build/module-cache" -framework AppKit -framework ApplicationServices AutoKeyerRemake.swift -o "$STAGING_APP/Contents/MacOS/AutoKeyerRemake"
xattr -cr "$STAGING_APP"
codesign --force --sign - "$STAGING_APP"
codesign --verify --deep --strict "$STAGING_APP"
rm -rf "$APP"
mv "$STAGING_APP" "$APP"
codesign --verify --deep --strict "$APP"
printf '%s\n' "$SOURCE_HASH" > .build/source.sha256
printf 'Built %s\n' "$APP"
