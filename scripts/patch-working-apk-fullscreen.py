#!/usr/bin/env python3
"""Safely repack the ORIGINAL working FamilyBook.apk with only Android CSS adjustments.

Does not touch the native manifest, classes, scripts, themes, site, or database.
APK must be zipaligned and re-signed after this repack.
"""
from pathlib import Path
from zipfile import ZipFile

SOURCE = Path("downloads/FamilyBook.apk")
DEST = Path("build/fullscreen/FamilyBook-original-unsigned.apk")
CSS_PATH = "assets/public/css/apk-native.css"
CSS_FIX = """
/* Fullscreen isolation test: Android already inset this WebView for system bars.
   Do not paint or reserve a second, black status/navigation bar inside it.
   ONLY affects the app's bundled CSS, never the public website. */
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

def main():
    if not SOURCE.is_file():
        raise SystemExit(f"Missing known-working APK: {SOURCE}")
    DEST.parent.mkdir(parents=True, exist_ok=True)
    changed = 0
    with ZipFile(SOURCE) as source, ZipFile(DEST, "w") as dest:
        for entry in source.infolist():
            data = source.read(entry)
            if entry.filename == CSS_PATH:
                css = data.decode("utf-8")
                required = ("--fb-apk-status-h:", "--fb-apk-navigation-h:",
                            "html.native-app body::before")
                if any(token not in css for token in required):
                    raise ValueError("Unexpected source CSS, refusing to patch")
                data = (css.rstrip() + "\n" + CSS_FIX).encode("utf-8")
                changed += 1
            dest.writestr(entry, data)
    if changed != 1:
        DEST.unlink(missing_ok=True)
        raise RuntimeError(f"Expected exactly one CSS file, updated {changed}")
    with ZipFile(DEST) as patched:
        bad = patched.testzip()
        if bad:
            raise RuntimeError(f"CRC mismatch in {bad}")
        source_names = set(ZipFile(SOURCE).namelist())
        if set(patched.namelist()) != source_names:
            raise RuntimeError("Repack unexpectedly changed archive members")
    print(f"Repacked original APK: {DEST}")
    print("Only changed: " + CSS_PATH)

if __name__ == "__main__":
    main()
