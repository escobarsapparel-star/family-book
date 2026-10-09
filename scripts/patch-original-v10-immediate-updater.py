#!/usr/bin/env python3
"""Family Book test APK with dark Gallery and immediate App Updates controls.

Uses the original known-working APK/native code via the already verified patch
chain, and includes the OTA manual-update UI and Gallery theme offline.
Only changes existing WebView files and retains all admin role checks.
"""
from __future__ import annotations
import argparse
import runpy
from pathlib import Path
from zipfile import ZipFile

PREV=runpy.run_path("scripts/patch-original-embedded-ota-updater.py")
P="assets/public/"
STYLE=P+"css/fb-mobile-bundled.css"
BOOT=P+"js/fb-mobile-ota.js"
HTML=P+"index.html"
MENU=P+"js/profile-avatar-route.js"

def patch(source:Path, dest:Path):
    dest.parent.mkdir(parents=True,exist_ok=True)
    base=dest.parent/"FamilyBook-v8-ota-bundled-unsigned.apk"
    PREV["patch"](source,base)
    dark_css=Path("mobile-ota/releases/10/gallery-dark.css").read_text(encoding="utf-8")
    if "Family Book dark / system gallery shortcut correction, OTA v10" not in dark_css:
        raise RuntimeError("Expected checked dark theme stylesheet")
    with ZipFile(base) as old:
        css=old.read(STYLE).decode("utf-8")
        boot=old.read(BOOT).decode("utf-8")
        html=old.read(HTML).decode("utf-8")
        menu=old.read(MENU).decode("utf-8")
        if boot.count("if(manifest.version<=8||manifest.assets.length===0)")!=1:
            raise RuntimeError("Unexpected bundled OTA version guard")
        if html.count("window.FB_BUNDLED_OTA_VERSION=8;")!=1:
            raise RuntimeError("Unexpected bundled version label")
        boot=boot.replace("if(manifest.version<=8||manifest.assets.length===0)",
                          "if(manifest.version<=10||manifest.assets.length===0)")
        html=html.replace("window.FB_BUNDLED_OTA_VERSION=8;",
                          "window.FB_BUNDLED_OTA_VERSION=10;")
        # This native-only menu entry appears immediately on startup. It must
        # not wait for the network hotfix updater to download OTA files.
        start='<button type="button" class="mobile-profile-menu-wide fb-mobile-menu-appearance"'
        if menu.count(start)!=1: raise RuntimeError("Profile menu markup changed")
        row='<button type="button" class="mobile-profile-menu-wide fb-mobile-menu-ota" data-mobile-ota-settings><span><i data-lucide="download-cloud"></i></span><span><strong>App updates</strong><small>Check & install OTA fixes</small></span><i data-lucide="chevron-right"></i></button>'
        menu=menu.replace(start,row+'\n        '+start)
        listener="    menu.querySelector('[data-mobile-appearance]')?.addEventListener('click',()=>{"
        if menu.count(listener)!=1: raise RuntimeError("Profile menu handler changed")
        menu=menu.replace(listener,"""    menu.querySelector('[data-mobile-ota-settings]')?.addEventListener('click',()=>{
      routeFromMenu('settings');
      setTimeout(()=>{
        window.FB_OTA_SETTINGS?.render?.();
        document.getElementById('settingsOtaUpdates')?.scrollIntoView({behavior:'smooth',block:'start'});
      },120);
    });
"""+listener)
        # Never alter admin role logic. The sole invitation control is still
        # inside the role='admin' branch in the ORIGINAL app.
        if "admin=String(u.role||'')==='admin'" not in menu or "admin?'<button" not in menu:
            raise RuntimeError("Refusing to change role-specific admin access")
        assert menu.count('data-mobile-menu-route="family-access"')==1
        changed={STYLE:(css.rstrip()+"\n"+dark_css+"\n").encode("utf-8"),
                 BOOT:boot.encode(),HTML:html.encode(),MENU:menu.encode()}
        with ZipFile(dest,"w") as output:
            for item in old.infolist():
                output.writestr(item,changed.get(item.filename,old.read(item)))
    with ZipFile(base) as old, ZipFile(dest) as latest:
        assert latest.testzip() is None
        assert set(latest.namelist())==set(old.namelist())
        for item in old.infolist():
            if item.filename not in changed and item.CRC!=latest.getinfo(item.filename).CRC:
                raise RuntimeError("Unexpected unrelated APK mutation")
        content=latest.read(MENU).decode()
        assert 'data-mobile-ota-settings' in content
        assert "admin=String(u.role||'')==='admin'" in content
        assert content.count('data-mobile-menu-route="family-access"')==1
        assert "if(manifest.version<=10" in latest.read(BOOT).decode()
        assert "fb-settings-ota-updater.js" in latest.read(HTML).decode()
    print("PASS: Family Video Gallery dark theme preinstalled, no OTA required")
    print("PASS: manual App Updates button present immediately for every member")
    print("PASS: only admins receive Invite & family access")
    print("PASS: OTA baseline v10; future OTA v11+ still supported")
    print("PASS: stable camera/gallery, cached thumbnails and native APK unchanged")
    print("Unsigned output:",dest)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",type=Path,default=Path("downloads/FamilyBook.apk"))
    parser.add_argument("--output",type=Path,default=Path("build/v10-app/FamilyBook-v10-immediate-ota-unsigned.apk"))
    args=parser.parse_args()
    patch(args.source,args.output)
