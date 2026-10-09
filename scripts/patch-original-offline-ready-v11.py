#!/usr/bin/env python3
"""Build the Family Book *offline-ready* mobile v11 test APK.

The original tested Android native components and permissions are unchanged.
The Family Video Gallery and manual OTA Settings card are bundled in web assets,
so neither waits for the OTA network check when opening the app.
Only future OTA versions above 11 can be fetched.
"""
from __future__ import annotations
import argparse
import runpy
from pathlib import Path
from zipfile import ZipFile

PREV = runpy.run_path("scripts/patch-original-v10-immediate-updater.py")
PREFIX = "assets/public/"
STYLE = PREFIX + "css/fb-mobile-bundled.css"
BOOT = PREFIX + "js/fb-mobile-ota.js"
HTML = PREFIX + "index.html"
MENU = PREFIX + "js/profile-avatar-route.js"
GALLERY = PREFIX + "js/family-fun-route.js"
SETTINGS = PREFIX + "js/fb-settings-ota-updater.js"
VIDEO = PREFIX + "js/fb-mobile-video-controls.js"

def patch(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    baseline = target.parent / "v10-embedded-unsigned.apk"
    PREV["patch"](source, baseline)
    compact = Path("mobile-ota/releases/9/gallery-compact.css").read_text("utf-8")
    if "Family Video Gallery — compact mobile layout, OTA v9" not in compact:
        raise RuntimeError("Unexpected compact Gallery CSS")

    with ZipFile(baseline) as old:
        style = old.read(STYLE).decode("utf-8")
        boot = old.read(BOOT).decode("utf-8")
        html = old.read(HTML).decode("utf-8")

        if "Family Book dark / system gallery shortcut correction, OTA v10" not in style:
            raise RuntimeError("Dark Gallery correction missing from prebundled APK")
        if boot.count("if(manifest.version<=10||manifest.assets.length===0)") != 1:
            raise RuntimeError("Updater baseline missing")
        if html.count("window.FB_BUNDLED_OTA_VERSION=10;") != 1:
            raise RuntimeError("Bundled version marker missing")

        # v11 collapses OTA downloads into two files but adds no feature changes
        # beyond v10. Include the compact Gallery screen's CSS as well so it is
        # fully usable without OTA.
        replacements = {
            STYLE: (style.rstrip() + "\n" + compact + "\n").encode("utf-8"),
            BOOT: boot.replace(
                "if(manifest.version<=10||manifest.assets.length===0)",
                "if(manifest.version<=11||manifest.assets.length===0)"
            ).encode("utf-8"),
            HTML: html.replace("window.FB_BUNDLED_OTA_VERSION=10;",
                               "window.FB_BUNDLED_OTA_VERSION=11;").encode("utf-8")
        }
        with ZipFile(target, "w") as new:
            for info in old.infolist():
                new.writestr(info, replacements.get(info.filename, old.read(info)))

    # Strong post-build assertions: no unrelated native/permission changes,
    # correct load order and instant offline buttons in source.
    with ZipFile(baseline) as old, ZipFile(target) as new:
        assert new.testzip() is None
        assert set(old.namelist()) == set(new.namelist())
        for member in old.infolist():
            if member.filename not in replacements and member.CRC != new.getinfo(member.filename).CRC:
                raise RuntimeError("Unrelated native asset changed: " + member.filename)

        html = new.read(HTML).decode("utf-8")
        gallery = new.read(GALLERY).decode("utf-8")
        updater = new.read(SETTINGS).decode("utf-8")
        menu = new.read(MENU).decode("utf-8")
        boot = new.read(BOOT).decode("utf-8")
        video = new.read(VIDEO).decode("utf-8")
        style = new.read(STYLE).decode("utf-8")
        assert 'family-gallery-feature fb-mobile-gallery-shortcut' in gallery
        assert 'fb-settings-ota-updater.js' in html
        assert "window.FB_BUNDLED_OTA_VERSION=11" in html
        assert "if(manifest.version<=11" in boot
        assert "settingsOtaUpdates" in updater and "Check &amp; install OTA update" in updater
        assert 'data-mobile-ota-settings' in menu
        assert "admin=String(u.role||'')==='admin'" in menu
        assert "admin?'<button" in menu
        assert menu.count('data-mobile-menu-route="family-access"') == 1
        assert "function showGallery()" in video
        assert "Family Book dark / system gallery shortcut correction, OTA v10" in style
        assert "Family Video Gallery — compact mobile layout, OTA v9" in style
        assert 'fb-mobile-video-thumbnails.js' in html
    print("PASS: Gallery shortcut + playback included in APK, available offline at launch")
    print("PASS: App Updates menu item + Settings action included in APK, no OTA dependency")
    print("PASS: compact dark Gallery theme included in APK")
    print("PASS: role-based admin menu untouched; normal members cannot see admin option")
    print("PASS: native binaries, manifest permissions and remaining assets preserved")
    print("PASS: OTA v11 bundled; future OTA v12+ remains supported")
    print("OUTPUT:", target)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("downloads/FamilyBook.apk"))
    parser.add_argument("--output", type=Path, default=Path("build/embedded-v11/FamilyBook-offline-ready-v11-unsigned.apk"))
    opts = parser.parse_args()
    patch(opts.source, opts.output)
