#!/usr/bin/env bash
set -euo pipefail

# Package dist/Phantom.app into a verified APFS DMG and generate SHA256SUMS.
# Usage: package-dmg.sh <app_bundle_path> <version> <output_dir>

APP_BUNDLE="${1:?Usage: package-dmg.sh <app_bundle_path> <version> <output_dir>}"
VERSION="${2:?Usage: package-dmg.sh <app_bundle_path> <version> <output_dir>}"
OUT_DIR="${3:?Usage: package-dmg.sh <app_bundle_path> <version> <output_dir>}"

if [[ ! -d "$APP_BUNDLE" ]]; then
    echo "ERROR: App bundle not found at $APP_BUNDLE" >&2
    exit 1
fi

mkdir -p "$OUT_DIR"
DMG_NAME="phantom-${VERSION}-macos-aarch64.dmg"
DMG_PATH="${OUT_DIR}/${DMG_NAME}"

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/phantom-dmg.XXXXXX")"
STAGE_DIR="${WORK_DIR}/stage"
MOUNT_DIR="${WORK_DIR}/mount"
VERIFY_DIR="${WORK_DIR}/verify"

cleanup() {
    if mount | grep -Fq "$MOUNT_DIR"; then
        hdiutil detach "$MOUNT_DIR" -quiet || hdiutil detach "$MOUNT_DIR" -force -quiet || true
    fi
    rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$STAGE_DIR" "$MOUNT_DIR" "$VERIFY_DIR"

echo "==> Staging Phantom.app for APFS DMG..."
ditto "$APP_BUNDLE" "$STAGE_DIR/Phantom.app"
ln -s /Applications "$STAGE_DIR/Applications"

rm -f "$DMG_PATH"
echo "==> Creating APFS DMG: $DMG_PATH ..."
hdiutil create \
    -volname "Phantom ${VERSION}" \
    -srcfolder "$STAGE_DIR" \
    -ov \
    -fs APFS \
    -format UDZO \
    "$DMG_PATH"

echo "==> Verifying DMG by read-only mount and clean copy..."
hdiutil attach "$DMG_PATH" -readonly -nobrowse -mountpoint "$MOUNT_DIR" -quiet
ditto "$MOUNT_DIR/Phantom.app" "$VERIFY_DIR/Phantom.app"
hdiutil detach "$MOUNT_DIR" -quiet

PLIST="$VERIFY_DIR/Phantom.app/Contents/Info.plist"
actual_version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$PLIST")"
actual_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$PLIST")"
actual_icon="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIconFile' "$PLIST")"

test "$actual_version" = "$VERSION" || { echo "ERROR: Version mismatch: $actual_version != $VERSION" >&2; exit 1; }
test "$actual_id" = "com.lee.phantom" || { echo "ERROR: Bundle ID mismatch: $actual_id" >&2; exit 1; }
test "$actual_icon" = "AppIcon" || { echo "ERROR: CFBundleIconFile mismatch: $actual_icon" >&2; exit 1; }
test -f "$VERIFY_DIR/Phantom.app/Contents/Resources/AppIcon.icns" || { echo "ERROR: AppIcon.icns missing" >&2; exit 1; }
test -x "$VERIFY_DIR/Phantom.app/Contents/Resources/bin/phantom-engine" || { echo "ERROR: phantom-engine binary missing or not executable" >&2; exit 1; }
test -f "$VERIFY_DIR/Phantom.app/Contents/Resources/geo/geoip.metadb" || { echo "ERROR: geoip.metadb missing" >&2; exit 1; }

echo "==> Verifying strict code signature on copied Phantom.app..."
codesign --verify --deep --strict --verbose=2 "$VERIFY_DIR/Phantom.app"

echo "==> Generating SHA256SUMS..."
(
    cd "$OUT_DIR"
    shasum -a 256 "$DMG_NAME" > SHA256SUMS
    cat SHA256SUMS
)

echo "==> Verified DMG ready: $DMG_PATH"
