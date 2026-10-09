#!/usr/bin/env python3
"""Family Book owner-only Admin Activity test APK based on original native app.

Inherits confirmed stable Gallery and OTA settings fixes. Existing Supabase
owner-authenticated RPCs provide historical signup/sign-in data.
"""
from __future__ import annotations
import argparse
import runpy
from pathlib import Path
from zipfile import ZipFile

BASE=runpy.run_path("scripts/patch-original-offline-ready-v11.py")
P="assets/public/"
INDEX=P+"index.html"
MENU=P+"js/profile-avatar-route.js"
STYLES=P+"css/fb-mobile-bundled.css"
ADMIN=P+"js/fb-platform-owner-activity.js"
OWNER="8d8bc782-cbf4-42ad-8f39-034d8a08b893"
DOLLAR_BRACE=chr(36)+"{"

def patch(source:Path,target:Path):
    target.parent.mkdir(parents=True,exist_ok=True)
    base=target.parent/"FamilyBook-offline-v11-base.apk"
    BASE["patch"](source,base)
    js=Path("scripts/assets/fb-platform-owner-activity.js").read_text("utf-8")
    styles=Path("scripts/assets/fb-platform-owner-activity.css").read_text("utf-8")
    for marker in ["get_platform_users","get_platform_auth_activity","get_platform_user_summary",OWNER]:
        if marker not in js:raise RuntimeError("Missing owner-only activity RPC")
    with ZipFile(base) as old:
        html=old.read(INDEX).decode("utf-8")
        menu=old.read(MENU).decode("utf-8")
        css=old.read(STYLES).decode("utf-8")
        entry='<script src="js/fb-settings-ota-updater.js"></script>'
        if html.count(entry)!=1:raise RuntimeError("Settings updater script missing")
        html=html.replace(entry,entry+'\n<script src="js/fb-platform-owner-activity.js"></script>')
        marker="const u=auth(),id=ownMemberId(),src=photo(),admin=String(u.role||'')==='admin';"
        if menu.count(marker)!=1:raise RuntimeError("Original mobile menu role guard changed")
        menu=menu.replace(marker,
             "const u=auth(),id=ownMemberId(),src=photo(),admin=String(u.role||'')==='admin',"
             "platformOwner=String(u.supabaseUserId||'')==='"+OWNER+"';")
        anchor=DOLLAR_BRACE+'admin?'+"""'<button type="button" class="mobile-profile-menu-admin" """
        if menu.count(anchor)!=1:raise RuntimeError("Existing admin invite button changed")
        row=DOLLAR_BRACE+"platformOwner?"+"""'<button type="button" class="mobile-profile-menu-admin fb-owner-only-activity" data-mobile-menu-route="admin-activity"><span><i data-lucide="activity"></i></span><span>Admin Activity — platform users</span><i data-lucide="chevron-right"></i></button>':''}
        """
        menu=menu.replace(anchor,row+anchor)
        updates={INDEX:html.encode(),MENU:menu.encode(),STYLES:(css.rstrip()+"\n"+styles+"\n").encode()}
        with ZipFile(target,"w") as new:
            for info in old.infolist():
                new.writestr(info,updates.get(info.filename,old.read(info)))
            new.writestr(ADMIN,js.encode())
    with ZipFile(base) as old,ZipFile(target) as new:
        assert new.testzip() is None
        assert set(new.namelist())==set(old.namelist())|{ADMIN}
        for info in old.infolist():
            if info.filename not in updates and info.CRC!=new.getinfo(info.filename).CRC:
                raise RuntimeError("Unrelated APK file changed: "+info.filename)
        menu=new.read(MENU).decode()
        html=new.read(INDEX).decode()
        backend=new.read(ADMIN).decode()
        assert "platformOwner=String(u.supabaseUserId||'')" in menu
        assert menu.count('data-mobile-menu-route="admin-activity"')==1
        assert menu.count('data-mobile-menu-route="family-access"')==1
        assert "admin?'<button" in menu
        assert "platformOwner?'<button" in menu
        assert "fb-platform-owner-activity.js" in html
        assert "fb-settings-ota-updater.js" in html
        assert "fb-mobile-video-controls.js" in html
        assert "fb-mobile-video-thumbnails.js" in html
        assert "family-gallery-feature fb-mobile-gallery-shortcut" in new.read(P+"js/family-fun-route.js").decode()
        assert 'if(!isOwner())return;' in backend
        assert 'window.go=function(route,...args)' in backend
    print("PASS: Admin Activity with registered users, recent sign-ins embedded offline")
    print("PASS: platform-owner-only account screen, family admins remain restricted")
    print("PASS: Gallery, thumbnail caching, OTA updater and Android native files unchanged")
    print("OUTPUT:",target)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",type=Path,default=Path("downloads/FamilyBook.apk"))
    parser.add_argument("--output",type=Path,default=Path("build/owner-activity/FamilyBook-owner-activity-unsigned.apk"))
    args=parser.parse_args()
    patch(args.source,args.output)
