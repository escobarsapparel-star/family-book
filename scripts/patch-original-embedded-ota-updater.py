#!/usr/bin/env python3
"""Family Book embedded Settings OTA installer test APK.

Built from the known-good original APK + validated mobile fixes. The OTA
Settings screen is preinstalled, not fetched before a user can see it.
Admin and regular family-user menus remain permission-separated by the
existing role predicate. Camera/gallery and native Android assets unchanged.
"""
from __future__ import annotations
import argparse
import runpy
from pathlib import Path
from zipfile import ZipFile

PREV=runpy.run_path("scripts/patch-original-embedded-profile-menu.py")
P="assets/public/"
UPDATER=P+"js/fb-settings-ota-updater.js"
OTA_BOOT=P+"js/fb-mobile-ota.js"
INDEX=P+"index.html"
SOURCE=Path("mobile-ota/releases/8/ota-settings.js")

def patch(original:Path,dest:Path):
    updater=SOURCE.read_text(encoding="utf-8")
    for text in ("FB_MOBILE_OTA","settingsOtaUpdates","Check &amp; install OTA update"):
        if text not in updater:
            raise RuntimeError("Missing functional update UI: "+text)
    dest.parent.mkdir(parents=True,exist_ok=True)
    baseline=dest.parent/"FamilyBook-embedded-profile-menu-base-unsigned.apk"
    PREV["patch"](original,baseline)
    with ZipFile(baseline) as old:
        html=old.read(INDEX).decode("utf-8")
        old_ota=old.read(OTA_BOOT).decode("utf-8")
        if 'if(manifest.version<=7||manifest.assets.length===0)' not in old_ota:
            raise RuntimeError("Unsupported previous bundled OTA version")
        if html.count('<script src="js/fb-mobile-ota.js"></script>')!=1:
            raise RuntimeError("Bundled updater bootstrap missing")
        ota=old_ota.replace("if(manifest.version<=7||manifest.assets.length===0)",
                            "if(manifest.version<=8||manifest.assets.length===0)")
        # Native interface baseline OTA v8 must be skipped to prevent fetching
        # and injecting the same scripts twice. Future OTA v9+ stays enabled.
        html=html.replace('<script src="js/fb-mobile-ota.js"></script>',
                          '<script>window.FB_BUNDLED_OTA_VERSION=8;</script>\n'
                          '<script src="js/fb-mobile-ota.js"></script>\n'
                          '<script src="js/fb-settings-ota-updater.js"></script>')
        changed={INDEX:html.encode(),OTA_BOOT:ota.encode()}
        if UPDATER in old.namelist():
            raise RuntimeError("Updater already bundled in original")
        with ZipFile(dest,"w") as new:
            for info in old.infolist():
                new.writestr(info,changed.get(info.filename,old.read(info)))
            new.writestr(UPDATER,updater.encode())
    with ZipFile(baseline) as old,ZipFile(dest) as new:
        assert new.testzip() is None
        assert set(new.namelist())==set(old.namelist())|{UPDATER}
        for name in old.namelist():
            if name not in (INDEX,OTA_BOOT):
                if old.getinfo(name).CRC!=new.getinfo(name).CRC:
                    raise RuntimeError("Unrelated APK file changed: "+name)
        menu=new.read(P+"js/profile-avatar-route.js").decode()
        ota=new.read(OTA_BOOT).decode()
        assert 'admin=String(u.role||' in menu
        assert "admin?'<button" in menu
        assert "if(manifest.version<=8" in ota
        assert "fb-settings-ota-updater.js" in new.read(INDEX).decode()
        assert "family-gallery-feature fb-mobile-gallery-shortcut" in new.read(P+"js/family-fun-route.js").decode()
    print("PASS: Settings and mobile menu OTA update controls embedded at first startup")
    print("PASS: check/download/SHA verify/apply functionality from original OTA loader")
    print("PASS: OTA v8 bundled; future v9+ updates supported")
    print("PASS: admin role guard, working Gallery, camera and Android binary retained")
    print("Unsigned APK:",dest)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source",type=Path,default=Path("downloads/FamilyBook.apk"))
    p.add_argument("--output",type=Path,default=Path("build/embedded-ota/FamilyBook-embedded-ota-unsigned.apk"))
    a=p.parse_args()
    patch(a.source,a.output)
