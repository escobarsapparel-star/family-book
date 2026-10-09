#!/usr/bin/env python3
"""Family Book Midnight Aurora Android performance test build.

Apply only an optional Midnight-theme CSS perf layer on top of the known
dark-default + owner-only admin + Gallery + OTA APK. The app's native binaries,
camera effects, videos, signup/signin permissions, and original Dark styling
are preserved exactly; the additional CSS is available offline.
"""
from __future__ import annotations
import argparse
import runpy
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

BASE=runpy.run_path("scripts/patch-original-midnight-mobile-theme.py")
ROOT="assets/public/"
STYLE=ROOT+"css/fb-midnight-android-performance.css"
INDEX=ROOT+"index.html"

def patch(source:Path,target:Path):
    target.parent.mkdir(parents=True,exist_ok=True)
    baseline=target.parent/"FamilyBook-midnight-repaired-base-unsigned.apk"
    BASE["patch"](source,baseline)
    style=Path("scripts/assets/fb-midnight-android-performance.css").read_bytes()
    for required in (
        b'html.native-app[data-fb-visual-theme="midnight-aurora"]',
        b"backdrop-filter:none!important",
        b"background-image:none!important",
        b"ct-lines path",
    ):
        if required not in style:
            raise RuntimeError("Performance stylesheet missing "+repr(required))

    with ZipFile(baseline) as old:
        index=old.read(INDEX).decode()
        if index.count("</head>")!=1:
            raise RuntimeError("Unexpected app document")
        link='<link rel="stylesheet" href="css/fb-midnight-android-performance.css">'
        if link in index or STYLE in old.namelist():
            raise RuntimeError("Performance stylesheet already included")
        new_index=index.replace("</head>",link+"\n</head>")
        if new_index.find("css/fb-midnight-apk-route-repairs.css")>=new_index.find(link):
            raise RuntimeError("Performance overrides must load after Gallery/Wall fixes")
        with ZipFile(target,"w") as out:
            for info in old.infolist():
                out.writestr(info,new_index.encode() if info.filename==INDEX else old.read(info))
            out.writestr(STYLE,style,compress_type=ZIP_DEFLATED)

    with ZipFile(baseline) as before,ZipFile(target) as after:
        assert after.testzip() is None
        assert set(after.namelist())==set(before.namelist())|{STYLE}
        for info in before.infolist():
            if info.filename!=INDEX and after.getinfo(info.filename).CRC!=info.CRC:
                raise RuntimeError("Previously stable file changed: "+info.filename)
        html=after.read(INDEX).decode()
        assert 'localStorage.getItem("fb_visual_theme")||"classic"' in html
        settings=after.read(ROOT+"js/settings.js").decode()
        assert 'theme:"dark"' in settings
        assert "fb-platform-owner-activity.js" in html
        assert "fb-settings-ota-updater.js" in html
        assert "fb-mobile-video-controls.js" in html
        owner=after.read(ROOT+"js/profile-avatar-route.js").decode()
        assert "platformOwner=String(u.supabaseUserId||'')" in owner
        assert "admin=String(u.role||'')==='admin'" in owner
        assert "fb-midnight-apk-route-repairs.css" in html
        assert "fb-midnight-android-performance.css" in html
        assert b"filter:none!important" in after.read(STYLE)
    print("PASS: Original Dark defaults unchanged; Midnight performance CSS opt-in")
    print("PASS: Removed expensive native Midnight blur/repeated effects")
    print("PASS: Gallery, owner permissions, OTA, camera and native binaries untouched")
    print("Unsigned APK:",target)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--source",type=Path,default=Path("downloads/FamilyBook.apk"))
    ap.add_argument("--output",type=Path,default=Path("build/midnight-performance/FamilyBook-midnight-performance-unsigned.apk"))
    x=ap.parse_args()
    patch(x.source,x.output)
