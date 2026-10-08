#!/usr/bin/env python3
"""Repack the original working Family Book APK with small mobile-only fixes.

Retains the proven fullscreen adjustment and excludes desktop widget startup.
Patches only the reaction loader and Family Camera web code/styles.
Adds an optional, checksum-verified web-only OTA loader; native files are unchanged.
"""
import argparse
import re
from pathlib import Path
from zipfile import ZipFile

CSS_PATH = "assets/public/css/apk-native.css"
INDEX_PATH = "assets/public/index.html"
FAMILY_FUN_HTML_PATH = "assets/public/family-fun.html"
SOCIAL_PATH = "assets/public/js/social-data.js"
CAMERA_JS_PATH = "assets/public/js/family-fun-studio.js"
CAMERA_CSS_PATH = "assets/public/css/family-fun.css"
OTA_JS_PATH = "assets/public/js/fb-mobile-ota.js"
OTA_JS_SOURCE = Path("android-app/mobile-ota/boot.js")

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

def patch_social(js):
    marker = '  function memberMap(){return Object.fromEntries(members().map(m=>[m.id,m]))}'
    if js.count(marker) != 1 or js.count('currentPersonPhoto(') != 2:
        raise ValueError("Unexpected social data baseline")
    fix = """  function currentPersonPhoto(people,personId,fallback=""){
    const id=String(personId||"");
    const member=people?.[id]||{};
    let photo=member.photo||fallback||"";
    const u=user();
    if(id&&id===String(u.memberId||"")){
      try{if(typeof window.currentUserPhoto==="function")photo=window.currentUserPhoto()||photo}catch(_){}
      photo=photo||u.photo||"";
    }
    return photo;
  }
"""
    return js.replace(marker, marker + "\n" + fix)

def patch_camera(js):
    status_anchor = '    status.textContent=message;'
    if js.count(status_anchor) != 1:
        raise ValueError("Camera status handler changed")
    js = js.replace(status_anchor, '''    // Do not float a permanent "Camera ready" chip over the preview.
    status.dataset.quiet = /^camera ready\\.?$/i.test(String(message||"").trim()) ? "true" : "false";
''' + status_anchor)
    mode_anchor = '  document.querySelectorAll("[data-fun-mode]").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.funMode)));'
    if js.count(mode_anchor) != 1:
        raise ValueError("Camera mode click handler changed")
    mode_logic = """
  // Swiping the camera mode wheel commits whichever mode settles in the centre.
  // Keep direct taps working and avoid changing mode during recording/review.
  const nativeModeStrip=document.getElementById("funCameraModeStrip");
  if(nativeModeStrip){
    let settleTimer=0;
    nativeModeStrip.addEventListener("scroll",()=>{
      clearTimeout(settleTimer);
      settleTimer=setTimeout(()=>{
        if(captureState!=="idle"||!nativeModeStrip.isConnected)return;
        const bounds=nativeModeStrip.getBoundingClientRect();
        const center=bounds.left+bounds.width/2;
        let nearest=null;
        let distance=Infinity;
        nativeModeStrip.querySelectorAll("[data-fun-mode]").forEach(button=>{
          const r=button.getBoundingClientRect();
          const d=Math.abs(r.left+r.width/2-center);
          if(d<distance){nearest=button;distance=d}
        });
        if(nearest&&nearest.dataset.funMode!==mode)setMode(nearest.dataset.funMode);
      },150);
    },{passive:true});
  }
"""
    return js.replace(mode_anchor, mode_anchor + "\n" + mode_logic)

CAMERA_CSS_FIX = """
/* APK-only Family Camera usability fixes. Desktop website CSS is unchanged. */
.fun-camera-fullscreen #funStatus[data-quiet="true"] { display:none!important; }
.fun-camera-fullscreen .fun-camera-rail {
  right:calc(10px + env(safe-area-inset-right,0px))!important;
  left:auto!important;
  top:max(68px,calc(58px + env(safe-area-inset-top,0px)))!important;
  width:52px!important;
  max-height:calc(100dvh - 198px)!important;
  gap:7px!important;
  display:flex!important;
  flex-direction:column!important;
  overflow-y:auto!important;
  overflow-x:visible!important;
  scrollbar-width:none;
  z-index:35!important;
}
.fun-camera-fullscreen .fun-camera-rail::-webkit-scrollbar{display:none}
.fun-camera-fullscreen .fun-camera-rail button{
  width:48px!important;
  min-height:46px!important;
  flex:0 0 auto!important;
  padding:5px 2px!important;
  box-sizing:border-box!important;
}
.fun-camera-fullscreen .fun-camera-rail button svg{width:19px!important;height:19px!important}
.fun-camera-fullscreen .fun-camera-rail button small{font-size:.60rem!important}
"""

def patch_apk(source, output):
    output.parent.mkdir(parents=True, exist_ok=True)
    changed = []
    with ZipFile(source) as original, ZipFile(output, "w") as patched:
        paths = set(original.namelist())
        if not {CSS_PATH, INDEX_PATH, FAMILY_FUN_HTML_PATH, SOCIAL_PATH, CAMERA_JS_PATH, CAMERA_CSS_PATH} <= paths:
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
                data = patch_html(data.decode("utf-8")).replace("</body>", '<script src="js/fb-mobile-ota.js"></script>\n</body>').encode("utf-8")
                changed.append(info.filename)
            elif info.filename == FAMILY_FUN_HTML_PATH:
                fun_html = data.decode("utf-8")
                if fun_html.count("</body>") != 1 or "js/family-fun-studio.js" not in fun_html:
                    raise ValueError("Unexpected Family Camera page baseline")
                data = fun_html.replace("</body>", '<script src="js/fb-mobile-ota.js"></script>\n</body>').encode("utf-8")
                changed.append(info.filename)
            elif info.filename == SOCIAL_PATH:
                data = patch_social(data.decode("utf-8")).encode("utf-8")
                changed.append(info.filename)
            elif info.filename == CAMERA_JS_PATH:
                data = patch_camera(data.decode("utf-8")).encode("utf-8")
                changed.append(info.filename)
            elif info.filename == CAMERA_CSS_PATH:
                data = (data.decode("utf-8").rstrip() + "\n" + CAMERA_CSS_FIX).encode("utf-8")
                changed.append(info.filename)
            patched.writestr(info, data)
        ota_source = OTA_JS_SOURCE.read_bytes()
        if not ota_source or not b"FB_MOBILE_OTA" in ota_source:
            raise RuntimeError("OTA client source missing or invalid")
        patched.writestr(OTA_JS_PATH, ota_source)
    with ZipFile(source) as original, ZipFile(output) as patched:
        if set(changed) != {CSS_PATH, INDEX_PATH, FAMILY_FUN_HTML_PATH, SOCIAL_PATH, CAMERA_JS_PATH, CAMERA_CSS_PATH}:
            raise RuntimeError(f"Unexpected patch set: {changed}")
        if set(original.namelist()) | {OTA_JS_PATH} != set(patched.namelist()):
            raise RuntimeError("Archive members changed unexpectedly")
        if patched.testzip() is not None:
            raise RuntimeError("ZIP CRC check failed")
        for name in original.namelist():
            if name not in changed and original.getinfo(name).CRC != patched.getinfo(name).CRC:
                raise RuntimeError(f"Unexpected modified file: {name}")
        html = patched.read(INDEX_PATH).decode("utf-8")
        fun_html = patched.read(FAMILY_FUN_HTML_PATH).decode("utf-8")
        if "js/fb-mobile-ota.js" not in fun_html:
            raise RuntimeError("Camera page OTA loader was not included")
        for name in DESKTOP_ONLY:
            if f"js/{name}.js" in html:
                raise RuntimeError(f"Desktop module still loaded: {name}")
    print("PASS: only app/camera page HTML, fullscreen CSS, social reactions and camera JS/CSS changed")
    print(f"PASS: excluded {len(DESKTOP_ONLY)} desktop widget and desktop shell modules")
    print("PASS: native files and existing remaining assets unchanged; optional web OTA loader added")
    print(f"Unsigned APK: {output}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("downloads/FamilyBook.apk"))
    parser.add_argument("--output", type=Path, default=Path("build/mobile-fixes/FamilyBook-original-mobile-fixes-unsigned.apk"))
    args = parser.parse_args()
    patch_apk(args.source, args.output)
