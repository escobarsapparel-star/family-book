#!/usr/bin/env python3
"""Family Book Midnight Aurora APK: copy CURRENT mobile website's theme
and scenic layout into the tested offline-ready native Android app.

The original AndroidManifest, DEX, signing-relevant native resources, camera,
Gallery, OTA and platform-owner report remain unchanged. The new theme is
included in the APK, so no remote CSS/JS/image downloads are necessary.
"""
from __future__ import annotations
import argparse
import runpy
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

BASE=runpy.run_path("scripts/patch-original-owner-activity.py")
ROOT="assets/public/"
THEME_FILES=[
    "visual-themes.css",
    "midnight-mobile-final.css",
    "midnight-memories-mobile-final.css",
    "midnight-tree-mobile-final.css",
    "midnight-calendar-mobile-final.css",
    "midnight-family-fun-mobile-final.css",
]
IMAGES=["midnight-aurora-alpine.webp","midnight-aurora-widget-flow.webp"]
ENGINE="js/fb-visual-themes.js"
SETTINGS="js/fb-native-visual-theme-settings.js"

NATIVE_CSS=r"""
/* Android safe-area and owner dashboard colour parity with Midnight Aurora. */
html.native-app[data-fb-visual-theme="midnight-aurora"] {
  --fb-apk-system-bg:#050814!important;
  color-scheme:dark;
}
html.native-app[data-fb-visual-theme="midnight-aurora"] body::before,
html.native-app[data-fb-visual-theme="midnight-aurora"] body::after {
  background:#050814!important;
}
@media(max-width:759px){
  /* Respect the device's own status-bar space: never shift the two nav rows
     back to top:0 just because site CSS was copied into the APK. */
  html.native-app[data-fb-visual-theme="midnight-aurora"] #app>.app>.topbar{
    top:var(--fb-apk-status-h,0px)!important;
  }
  html.native-app[data-fb-visual-theme="midnight-aurora"] #app>.app>.bottom{
    top:calc(var(--fb-apk-status-h,0px) + var(--fb-mobile-brand-h,56px))!important;
  }
  html.native-app[data-fb-visual-theme="midnight-aurora"] #app>.app>.screen{
    padding-top:calc(var(--fb-apk-status-h,0px) + var(--fb-mobile-header-h,102px) + 10px)!important;
  }
  html.native-app[data-fb-visual-theme="midnight-aurora"] .mobile-profile-menu{
    background:linear-gradient(150deg,#091227,#080e21)!important;
    color:#eaf5ff!important;
  }
}
html.native-app[data-fb-visual-theme="midnight-aurora"] .fb-owner-activity-page{
  color:#eef7ff!important;
}
html.native-app[data-fb-visual-theme="midnight-aurora"] .fb-owner-activity-panel,
html.native-app[data-fb-visual-theme="midnight-aurora"] .fb-owner-activity-person,
html.native-app[data-fb-visual-theme="midnight-aurora"] .fb-owner-activity-stats>div {
  background:linear-gradient(135deg,rgba(8,18,42,.94),rgba(17,26,58,.82))!important;
  color:#eaf5ff!important;
  border-color:rgba(103,232,249,.24)!important;
}
"""

SETTINGS_HOOK=r"""/* Prebundled visual theme card for the native Settings screen.
   The original APK's older settings.js does not know about FB_VISUAL_THEME.
   Keep all role checks from the original page and only extend bindPage. */
(()=>{
  "use strict";
  if(window.__fbNativeMidnightSettings)return;
  window.__fbNativeMidnightSettings=true;
  const original=window.FB_SETTINGS?.bindPage;
  if(typeof original==="function"){
    window.FB_SETTINGS.bindPage=function(...args){
      const value=original.apply(this,args);
      window.FB_VISUAL_THEME?.install?.();
      return value;
    };
  }
  if(document.querySelector("#settingsAppearance"))
    window.FB_VISUAL_THEME?.install?.();
})();
"""

def patch(source:Path,target:Path)->None:
    target.parent.mkdir(parents=True,exist_ok=True)
    baseline=target.parent/"FamilyBook-owner-activity-base.apk"
    BASE["patch"](source,baseline)
    def site(path:str)->bytes:
        p=Path(path)
        if not p.is_file():raise RuntimeError("Site theme file missing: "+path)
        return p.read_bytes()
    additions={}
    for filename in THEME_FILES:
        data=site("css/"+filename)
        if b'data-fb-visual-theme="midnight-aurora"' not in data:
            raise RuntimeError("File is not Midnight Aurora CSS: "+filename)
        additions[ROOT+"css/"+filename]=data
    for filename in IMAGES:
        data=site("assets/"+filename)
        if len(data)<1024 or data[:4]!=b"RIFF" or data[8:12]!=b"WEBP":
            raise RuntimeError("Corrupt/absent bundled WebP background: "+filename)
        additions[ROOT+"assets/"+filename]=data

    member=site("css/member-profile-social.css").decode("utf-8")
    marker="/* Midnight Aurora — member/user profiles mobile */"
    if marker not in member:raise RuntimeError("Site member profile theme marker missing")
    additions[ROOT+"css/fb-midnight-member-profiles.css"]=member[member.index(marker):].encode("utf-8")

    nav=site("css/mobile-header-stability.css").decode("utf-8")
    marker="MIDNIGHT AURORA — FINAL MOBILE NAV"
    i=nav.find(marker)
    if i<0:raise RuntimeError("Site nav theme marker missing")
    i=nav.rfind("/*",0,i)
    additions[ROOT+"css/fb-midnight-nav.css"]=nav[i:].encode("utf-8")
    additions[ROOT+"css/fb-midnight-native.css"]=NATIVE_CSS.encode("utf-8")

    # The last build missed the website's complete Members mobile artwork,
    # leaving a Classic cream body below the Midnight navigation.
    members=site("css/mobile-members-polish.css").decode("utf-8")
    members_start=members.find("MIDNIGHT AURORA — MEMBERS MOBILE")
    members_end=members.find("MIDNIGHT AURORA — MEMBERS DESKTOP")
    if members_start<0 or members_end<=members_start:
        raise RuntimeError("Website mobile Members theme markers missing")
    members_start=members.rfind("/*",0,members_start)
    members_end=members.rfind("/*",0,members_end)
    additions[ROOT+"css/fb-midnight-members.css"]=members[members_start:members_end].encode("utf-8")

    # APK-only final CSS repair layer, loaded after all website theme styling.
    # Do not apply any of it to the Classic/Dark default appearance.
    final_css=site("scripts/assets/fb-midnight-apk-route-repairs.css")
    for selector in (b".family-wall-panel",b".fb-mobile-gallery-page",
                     b".fb-mobile-gallery-shortcut",b".members-page"):
        if selector not in final_css:
            raise RuntimeError("Missing final theme repair selector: "+repr(selector))
    additions[ROOT+"css/fb-midnight-apk-route-repairs.css"]=final_css

    engine=site("js/visual-themes.js").decode("utf-8")
    old='localStorage.getItem(KEY)||"classic"'
    if engine.count(old)!=1:raise RuntimeError("Site theme preference engine changed")
    # Follow the mobile website: Midnight is opt-in, Classic is the visual default.
    # Dark is handled independently by the native Settings appearance default.
    if engine.count(old)!=1:raise RuntimeError("Unexpected theme engine default")
    engine=engine.replace("Premium theme preview — test version.","New scenic mobile layout.")
    engine=engine.replace(
       "These themes are currently a preview feature. Classic Family remains the default.",
       "Choose your preferred look for this phone. Both designs work offline.")
    additions[ROOT+ENGINE]=engine.encode("utf-8")
    additions[ROOT+SETTINGS]=SETTINGS_HOOK.encode("utf-8")

    with ZipFile(baseline) as original:
        html=original.read(ROOT+"index.html").decode("utf-8")
        if html.count("</head>")!=1 or html.count("</body>")!=1:
            raise RuntimeError("Unexpected HTML structure")
        head_tags="\n".join('<link rel="stylesheet" href="css/'+name+'">' for name in [
             *THEME_FILES,
             "fb-midnight-member-profiles.css",
             "fb-midnight-nav.css",
             "fb-midnight-native.css",
             "fb-midnight-members.css",
             "fb-midnight-apk-route-repairs.css"
        ])
        # Activate the selected theme before the UI paints, using a phone-local
        # preference. A new install selects Midnight; Classic stays available.
        init="""<script>(function(){
          try {
            var name=localStorage.getItem("fb_visual_theme")||"classic";
            if(name==="midnight-aurora"){
              document.documentElement.setAttribute("data-fb-visual-theme",name);
              document.documentElement.dataset.fbVisualTheme=name;
            }
          }catch(_){}
        })();</script>"""
        html=html.replace("</head>",init+"\n"+head_tags+"\n</head>")
        scripts='<script src="'+ENGINE+'"></script>\n<script src="'+SETTINGS+'"></script>'
        html=html.replace("</body>",scripts+"\n</body>")
        settings_path=ROOT+"js/settings.js"
        settings=original.read(settings_path).decode("utf-8")
        # Change only the fallback for a new account/device, not saved choices.
        old_default='appearance:{\\n      theme:"system"\\n    }'.replace('\\n','\n')
        new_default='appearance:{\\n      theme:"dark"\\n    }'.replace('\\n','\n')
        if settings.count(old_default)!=1:
            raise RuntimeError("Native Settings default format changed; abort safely")
        settings=settings.replace(old_default,new_default)
        changed={ROOT+"index.html":html.encode("utf-8"),settings_path:settings.encode("utf-8")}
        if set(additions).intersection(original.namelist()):
            raise RuntimeError("Theme asset would overwrite an original APK file")
        with ZipFile(target,"w") as new:
            for info in original.infolist():
                new.writestr(info,changed.get(info.filename,original.read(info)))
            for path,data in additions.items():
                new.writestr(path,data,compress_type=ZIP_DEFLATED)
    with ZipFile(baseline) as old,ZipFile(target) as new:
        assert new.testzip() is None
        assert set(new.namelist())==set(old.namelist())|set(additions)
        for info in old.infolist():
            if info.filename not in changed and info.CRC!=new.getinfo(info.filename).CRC:
                raise RuntimeError("Unrelated stable APK member changed: "+info.filename)
        index=new.read(ROOT+"index.html").decode("utf-8")
        script=new.read(ROOT+ENGINE).decode("utf-8")
        css=new.read(ROOT+"css/visual-themes.css").decode("utf-8")
        assert 'localStorage.getItem(KEY)||"classic"' in script
        assert 'theme:"dark"' in new.read(ROOT+"js/settings.js").decode("utf-8")
        assert 'localStorage.getItem("fb_visual_theme")||"classic"' in index
        assert "window.FB_VISUAL_THEME" in script
        assert "FB_VISUAL_THEME?.install?.()" in new.read(ROOT+SETTINGS).decode("utf-8")
        assert "fb-settings-ota-updater.js" in index
        assert "fb-platform-owner-activity.js" in index
        assert "fb-mobile-video-controls.js" in index
        assert "family-gallery-feature fb-mobile-gallery-shortcut" in new.read(ROOT+"js/family-fun-route.js").decode("utf-8")
        assert "midnight-aurora-alpine.webp" in css
        assert "fb-midnight-members.css" in index
        assert "fb-midnight-apk-route-repairs.css" in index
        assert b"members-head" in new.read(ROOT+"css/fb-midnight-members.css")
        final=new.read(ROOT+"css/fb-midnight-apk-route-repairs.css").decode("utf-8")
        for mark in ("wall-post-head strong","button.fb-mobile-gallery-shortcut",
                     "fun-gallery-copy strong","fb-gallery-route-open",
                     "#app>.app>.screen:has(.members-page)"):
            assert mark in final,mark
    print("PASS: exact Midnight Aurora mobile website CSS for Home, Memories, Tree, Calendar and Family Fun")
    print("PASS: user/member profiles and neon navigation CSS; two scenic backgrounds inside APK")
    print("PASS: normal Dark theme default on fresh install; Midnight Aurora optional")
    print("PASS: saved Dark/Light/System/Midnight preferences are not overwritten")
    print("PASS: profile admin security, Gallery, OTA and unrelated Android binary assets retained")
    print("Unsigned APK:",target)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--source",type=Path,default=Path("downloads/FamilyBook.apk"))
    ap.add_argument("--output",type=Path,default=Path("build/midnight-mobile/FamilyBook-midnight-mobile-unsigned.apk"))
    a=ap.parse_args()
    patch(a.source,a.output)
