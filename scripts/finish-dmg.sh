#!/bin/bash
#
# Tidies the install window of a built .dmg.
#
# The bundler puts a .VolumeIcon.icns at the root of the disk image so the
# mounted volume gets the app's icon, and the Finder draws that file in the
# install window next to the application the user is meant to drag. A leading
# dot does not hide it and neither does the hidden flag, because the window
# arrangement the bundler writes records an icon position for it.
#
# So the file goes. The cost is that the mounted disk shows the standard
# volume icon for the few seconds it is mounted; the gain is that the window
# every single user sees contains only the two things they need.
#
# Usage: scripts/finish-dmg.sh [path/to/image.dmg]   (defaults to the newest build)
#
set -euo pipefail

DMG="${1:-}"
if [ -z "$DMG" ]; then
  DMG="$(ls -t src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null | head -1)"
fi
[ -n "$DMG" ] && [ -f "$DMG" ] || { echo "No disk image found. Build one first." >&2; exit 1; }

WORK="$(mktemp -d)"
MOUNT=""

cleanup() {
  [ -n "$MOUNT" ] && hdiutil detach "$MOUNT" -force -quiet 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

# A shipped image is read-only and compressed, so it is unpacked, edited and
# packed again rather than written to in place.
hdiutil convert "$DMG" -format UDRW -o "$WORK/rw" -quiet
MOUNT="$(hdiutil attach "$WORK/rw.dmg" -nobrowse -noverify | awk -F'\t' '/\/Volumes\// {print $NF}' | tail -1)"
[ -n "$MOUNT" ] || { echo "Could not mount the disk image." >&2; exit 1; }

if [ -e "$MOUNT/.VolumeIcon.icns" ]; then
  rm -f "$MOUNT/.VolumeIcon.icns"
  echo "Removed .VolumeIcon.icns"
else
  echo "No .VolumeIcon.icns — nothing to do."
fi

# Sanity: the two things the window is for must still be there.
[ -d "$MOUNT/Movies.app" ] || { echo "Movies.app is missing from the image." >&2; exit 1; }
[ -e "$MOUNT/Applications" ] || { echo "The Applications link is missing." >&2; exit 1; }

sync
hdiutil detach "$MOUNT" -quiet
MOUNT=""

hdiutil convert "$WORK/rw.dmg" -format UDZO -imagekey zlib-level=9 -o "$WORK/out" -quiet
mv -f "$WORK/out.dmg" "$DMG"
echo "Rewrote $DMG"
