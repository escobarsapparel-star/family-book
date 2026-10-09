#!/usr/bin/env python3
"""Bundle the website's complete mobile profile menu into Family Book's stable
native APK while keeping Invite & family access strictly admin-only."""
from __future__ import annotations
import argparse
import runpy
from pathlib import Path
from zipfile import ZipFile

BASE=runpy.run_path("scripts/patch-original-embedded-gallery.py")
P="assets/public/"
PROFILE_PATH=P+"js/profile-avatar-route.js"
PROFILE_CSS_PATH=P+"css/mobile-profile-menu.css"
ANDROID_CSS_PATH=P+"css/apk-native.css"

ANDROID_FIX="""
/* Paint the Android status area behind native system icons. The former
   transparent area let scrolled profile/settings content bleed into the bar. */
html.native-app body::before {
  content:""!important; display:block!important;
  position:fixed!important; top:0!important;left:0!important;right:0!important;
  height:var(--fb-apk-status-h,0px)!important;
  background:var(--fb-apk-system-bg,#151813)!important;
  pointer-events:none!important;z-index:2147483000!important;
}
html[data-theme="light"].native-app body::before{background:#faf9f4!important}
@media(prefers-color-scheme:light) {
 html.native-app:not([data-theme="dark"]) body::before{background:#faf9f4!important}
}
/* Android status height must be part of the floating menu's top offset.
   Keep its content scrollable so the last controls remain reachable. */
@media(max-width:759px) {
 html.native-app .mobile-profile-menu {
  position:fixed!important;
  top:calc(var(--fb-apk-status-h,0px) + var(--fb-mobile-header-h,102px))!important;
  bottom:0!important;left:0!important;right:0!important;height:auto!important;
  min-height:0!important;display:flex!important;flex-direction:column!important;
  z-index:1900!important;
 }
 html.native-app .mobile-profile-menu-scroll{
  min-height:0!important;flex:1 1 auto!important;
  overflow-y:auto!important;overflow-x:hidden!important;
  -webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  padding-bottom:max(40px,env(safe-area-inset-bottom,0px))!important;
 }
 html.native-app body.fb-mobile-menu-open{overflow:hidden!important}
}
"""

def patch(source:Path,output:Path):
    profile=Path("js/profile-avatar-route.js").read_text(encoding="utf-8")
    css=Path("css/mobile-profile-menu.css").read_text(encoding="utf-8")
    if "admin=String(u.role||'')==='admin'" not in profile:
        raise RuntimeError("Admin role guard changed; refusing build")
    if "admin?'<button" not in profile or 'data-mobile-menu-route="family-access"' not in profile:
        raise RuntimeError("Admin invite row must remain conditional")
    if profile.count('data-mobile-menu-route="family-access"')!=1:
        raise RuntimeError("Duplicate/unconditional admin access row")
    public=["memories","members","tree","calendar","notifications","settings"]
    for route in public:
        if 'data-mobile-menu-route="'+route+'"' not in profile:
            raise RuntimeError("Missing normal profile menu item: "+route)
    for marker in ("data-mobile-appearance","data-mobile-help-about","data-mobile-signout"):
        if marker not in profile:raise RuntimeError("Missing public item: "+marker)
    output.parent.mkdir(parents=True,exist_ok=True)
    baseline=output.parent/"FamilyBook-embedded-gallery-base-unsigned.apk"
    BASE["patch_apk"](source,baseline)
    modified={PROFILE_PATH:profile.encode("utf-8"),PROFILE_CSS_PATH:css.encode("utf-8")}
    with ZipFile(baseline) as original:
        native=original.read(ANDROID_CSS_PATH).decode("utf-8")
        modified[ANDROID_CSS_PATH]=(native.rstrip()+"\n"+ANDROID_FIX).encode("utf-8")
        with ZipFile(output,"w") as target:
            for info in original.infolist():
                target.writestr(info,modified.get(info.filename,original.read(info)))
    with ZipFile(baseline) as original,ZipFile(output) as target:
        if target.testzip() is not None:raise RuntimeError("Corrupt output")
        if set(original.namelist())!=set(target.namelist()):
            raise RuntimeError("Unexpected APK members")
        for path in original.namelist():
            if path not in modified and original.getinfo(path).CRC!=target.getinfo(path).CRC:
                raise RuntimeError("Unrelated APK asset changed: "+path)
        assert "admin=String(u.role||'')==='admin'" in target.read(PROFILE_PATH).decode()
        assert "data-mobile-signout" in target.read(PROFILE_PATH).decode()
        assert "data-mobile-appearance" in target.read(PROFILE_PATH).decode()
        assert "fb-mobile-video-controls.js" in target.read(P+"index.html").decode()
        assert "fb-mobile-gallery-shortcut" in target.read(P+"js/family-fun-route.js").decode()
    print("PASS: mobile profile menu standard options bundled, admin invite route stays gated")
    print("PASS: status bar content masked, menu inset and scrolling corrected")
    print("PASS: original stable Gallery, videos, reactions, OTA, native files retained")
    print("Unsigned APK:",output)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--source",type=Path,default=Path("downloads/FamilyBook.apk"))
    ap.add_argument("--output",type=Path,default=Path("build/embedded-menu/FamilyBook-embedded-menu-unsigned.apk"))
    a=ap.parse_args()
    patch(a.source,a.output)
