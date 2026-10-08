#!/usr/bin/env python3
"""Repack the confirmed-working original APK for an Android-only, no-desktop-widgets test.

Exactly two assets change: the bundled index.html and Android fullscreen CSS.
Native manifest, plugins, JS source files and production website stay untouched.
The repacked APK is unsigned; the workflow zipaligns and signs it separately.
"""
import argparse
import re
from pathlib import Path
from zipfile import ZipFile

CSS_PATH = "assets/public/css/apk-native.css"
INDEX_PATH = "assets/public/index.html"
DESKTOP_ONLY = (
    "desktop-shell-v2",
    "desktop-left-members-first",
    "family-spotlight",
    "weather-location-label",
    "desktop-date-time",
    "family-countdown",
    "family-prayer-widget",
    "desktop-header-search",
    "compact-widgets-drawer",
)
CSS_FIX = """
/* Working fullscreen fix. Android already reserves system-bar safe areas. */
html.native-app {
  --fb-apk-status-h: 0px !important;
  --fb-apk-navigation-h: 0px !important;
}
html.native-app body::before,
html.native-app body::after {
  content: none !important;
  display: none !important;
}
"""

def patch_html(html):
    for name in DESKTOP_ONLY:
        pattern = r'<script\s+src="js/' + re.escape(name) + r'\.js(?:\?[^"]*)?"\s*></script>'
        html, count = re.subn(pattern, "", html)
        if count != 1:
            raise ValueError(f"Expected exactly one desktop script for {name}; found {count}")
    if '<script src="js/app.js' not in html or '<script src="js/apk-native-enhancements.js' not in html:
        raise ValueError("Core application or native bridge scripts missing")
    return html

def patch_apk(source, output):
    output.parent.mkdir(parents=True, exist_ok=True)
    changed = []
    with ZipFile(source) as original, ZipFile(output, "w") as patched:
        paths = set(original.namelist())
        if not {CSS_PATH, INDEX_PATH} <= paths:
            raise RuntimeError("Wrong original APK layout")
        for info in original.infolist():
            data = original.read(info)
            if info.filename == CSS_PATH:
                css = data.decode("utf-8")
                for token in ("--fb-apk-status-h:", "--fb-apk-navigation-h:", "html.native-app body::before"):
                    if token not in css:
                        raise ValueError(f"Source CSS missing {token}")
                data = (css.rstrip() + "\n" + CSS_FIX).encode("utf-8")
                changed.append(info.filename)
            elif info.filename == INDEX_PATH:
                data = patch_html(data.decode("utf-8")).encode("utf-8")
                changed.append(info.filename)
            patched.writestr(info, data)
    with ZipFile(source) as original, ZipFile(output) as patched:
        if set(changed) != {CSS_PATH, INDEX_PATH}:
            raise RuntimeError(f"Unexpected patch set: {changed}")
        if set(original.namelist()) != set(patched.namelist()):
            raise RuntimeError("Archive members changed unexpectedly")
        if patched.testzip() is not None:
            raise RuntimeError("ZIP CRC check failed")
        for name in original.namelist():
            if name not in changed and original.getinfo(name).CRC != patched.getinfo(name).CRC:
                raise RuntimeError(f"Unexpected modified file: {name}")
        html = patched.read(INDEX_PATH).decode("utf-8")
        for name in DESKTOP_ONLY:
            if f"js/{name}.js" in html:
                raise RuntimeError(f"Desktop module still loaded: {name}")
    print(f"PASS: only {CSS_PATH} and {INDEX_PATH} changed")
    print(f"PASS: excluded {len(DESKTOP_ONLY)} desktop widget and desktop shell modules")
    print("PASS: original native files and all remaining assets unchanged")
    print(f"Unsigned APK: {output}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("downloads/FamilyBook.apk"))
    parser.add_argument("--output", type=Path, default=Path("build/mobile-lite/FamilyBook-original-mobile-lite-unsigned.apk"))
    args = parser.parse_args()
    patch_apk(args.source, args.output)
