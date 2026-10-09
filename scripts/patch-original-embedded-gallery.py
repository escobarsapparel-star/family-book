#!/usr/bin/env python3
"""Family Book diagnostic APK: original working native container + bundled mobile repairs.

No web assets are fetched at startup to create the Gallery UI. Camera, gallery,
video playback, thumbnail cache, reaction names and account menu live in the
APK. OTA stays optional for *future* releases above bundled version 7.
The signed test APK is separate from the user's known-working release.
"""
from __future__ import annotations
import argparse
import hashlib
import runpy
from pathlib import Path
from zipfile import ZipFile

BASE = runpy.run_path("scripts/patch-working-apk-mobile-fixes.py")
PREFIX = "assets/public/"
BUNDLE = "mobile-ota/releases/"
EXPECTED_ORIGINAL = "7270a0519eb77e2d663b9db8f6545b378364ead2fa2c4536344c29e4abfaff01"

# The old fullscreen fix set status area to 0 on every handset. Android 15
# phones with edge-to-edge WebView can then show the clock over Family Book.
# Keep the app fullscreen without painting artificial black bands. The script
# below detects whether the native window has already reserved system bars.
MOBILE_CSS = """
/* Bundled Gallery + multi-device Android status area: no black pseudo bars. */
html.native-app {
  --fb-apk-status-h: var(--fb-native-top-inset, 28px) !important;
  --fb-apk-navigation-h: 0px !important;
}
html.native-app body::before,
html.native-app body::after { content:none!important;display:none!important; }
@media(max-width:759px) {
  html.native-app #screen:has(#homeMemoryStripTrack) {
    touch-action:pan-x pan-y pinch-zoom!important;
  }
}
"""

SAFE_AREA_JS = r"""(()=>{
  if(window.__fbBundledSafeAreaV1)return;
  window.__fbBundledSafeAreaV1=true;
  const root=document.documentElement;
  if(!root.classList.contains("native-app"))return;
  function detect(){
    // CSS env() wins when WebView exposes the true safe-area inset.
    let cssSafe=0;
    try{
      const probe=document.createElement("div");
      probe.style.cssText="position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)";
      document.body.appendChild(probe);
      cssSafe=parseFloat(getComputedStyle(probe).paddingTop)||0;
      probe.remove();
    }catch(_){}
    // Some Android versions exclude the status/navigation bars from the
    // WebView viewport already. Do not add another 28px in that case.
    const available=Number(window.screen?.height)||0;
    const visible=Number(window.innerHeight)||0;
    const alreadyReserved=available>0&&visible>0&&(available-visible)>=46;
    const inset=cssSafe>0?Math.min(cssSafe,48):(alreadyReserved?0:28);
    root.style.setProperty("--fb-native-top-inset",inset+"px");
    root.dataset.fbStatusInset=String(inset);
  }
  detect();
  window.addEventListener("orientationchange",()=>setTimeout(detect,400),{passive:true});
})();"""

EMBED = [
  ("css/fb-mobile-bundled.css",
   [("6","camera-layout.css"),("6","video-controls.css"),
    ("7","mobile-ui-restoration.css")]),
  ("js/fb-mobile-video-controls.js",[("6","video-controls.js")]),
  ("js/fb-mobile-video-thumbnails.js",[("6","video-thumbnails.js")]),
  ("js/fb-mobile-social-reactions.js",[("7","social-reactions.js")]),
  ("js/fb-mobile-ui-restoration.js",[("7","mobile-ui-restoration.js")]),
]

def sources():
    compiled={}
    for target,parts in EMBED:
        data="\n".join((Path(BUNDLE)/v/name).read_text(encoding="utf-8")
                       for v,name in parts)
        compiled[PREFIX+target]=data.encode("utf-8")
    compiled[PREFIX+"js/fb-mobile-safe-area.js"]=SAFE_AREA_JS.encode("utf-8")
    return compiled

def patch_gallery_markup(js):
    anchor='<div class="fun-feature-card fun-feature-coming"'
    if js.count(anchor)!=1:
        raise RuntimeError("Expected one Family Games card in the original app")
    card='''<button class="fun-feature-card family-gallery-feature fb-mobile-gallery-shortcut" type="button" aria-label="Open Family Video Gallery">
      <span class="fun-feature-icon"><i data-lucide="film"></i></span>
      <span class="fun-feature-copy"><strong>Family Video Gallery</strong><small>Open your saved family clips</small></span>
      <span class="fun-feature-arrow"><i data-lucide="chevron-right"></i></span>
    </button>
    '''
    return js.replace(anchor,card+anchor)

def patch_native_swipe(js):
    needle=".memory-strip,.home-composer-modal"
    if js.count(needle)!=1:
        raise RuntimeError("Original mobile swipe interceptor has changed")
    return js.replace(needle,".memory-strip,.home-memory-strip-track,.home-composer-modal")

def patch_ota(js):
    # Future OTA updates are permitted, but don't download seven modules that
    # are already embedded. The legacy OTA validator erroneously rejected v7
    # because it supported only six entries.
    needle="m.assets.length<=6"
    if js.count(needle)!=1: raise RuntimeError("OTA validator unexpected")
    js=js.replace(needle,"m.assets.length<=12")
    needle="if(manifest.version===0||manifest.assets.length===0)"
    if js.count(needle)!=1: raise RuntimeError("OTA version guard unexpected")
    return js.replace(needle,"if(manifest.version<=7||manifest.assets.length===0)")

def patch_apk(source,output):
    if hashlib.sha256(source.read_bytes()).hexdigest()!=EXPECTED_ORIGINAL:
        raise RuntimeError("Source is not the original confirmed working APK")
    bundled=sources()
    output.parent.mkdir(parents=True,exist_ok=True)
    replace={}
    with ZipFile(source) as original:
        def get(path):return original.read(PREFIX+path).decode("utf-8")
        replace[PREFIX+"css/apk-native.css"]=(get("css/apk-native.css").rstrip()+"\n"+MOBILE_CSS).encode()
        replace[PREFIX+"js/social-data.js"]=BASE["patch_social"](get("js/social-data.js")).encode()
        replace[PREFIX+"js/family-fun-studio.js"]=BASE["patch_camera"](get("js/family-fun-studio.js")).encode()
        replace[PREFIX+"css/family-fun.css"]=(get("css/family-fun.css").rstrip()+"\n"+BASE["CAMERA_CSS_FIX"]).encode()
        replace[PREFIX+"js/family-fun-route.js"]=patch_gallery_markup(get("js/family-fun-route.js")).encode()
        replace[PREFIX+"js/apk-native-enhancements.js"]=patch_native_swipe(get("js/apk-native-enhancements.js")).encode()
        html=BASE["patch_html"](get("index.html"))
        if html.count("</head>")!=1 or html.count("</body>")!=1:
            raise RuntimeError("Unexpected APK HTML")
        html=html.replace("</head>",'<link rel="stylesheet" href="css/fb-mobile-bundled.css">\n</head>')
        scripts="\n".join('<script src="js/'+name+'"></script>' for name in (
          "fb-mobile-safe-area.js","fb-mobile-video-controls.js",
          "fb-mobile-video-thumbnails.js","fb-mobile-social-reactions.js",
          "fb-mobile-ui-restoration.js","fb-mobile-ota.js"))
        html=html.replace("</body>",scripts+"\n</body>")
        replace[PREFIX+"index.html"]=html.encode()
        funhtml=get("family-fun.html")
        funhtml=funhtml.replace("</body>",
            '<link rel="stylesheet" href="css/fb-mobile-bundled.css">'
            '<script src="js/fb-mobile-safe-area.js"></script>'
            '<script src="js/fb-mobile-video-controls.js"></script>'
            '<script src="js/fb-mobile-video-thumbnails.js"></script>'
            '<script src="js/fb-mobile-ota.js"></script></body>')
        replace[PREFIX+"family-fun.html"]=funhtml.encode()
        bundled[PREFIX+"js/fb-mobile-ota.js"]=patch_ota(
            Path("android-app/mobile-ota/boot.js").read_text(encoding="utf-8")).encode()

        preexisting=set(original.namelist())
        if set(replace)-preexisting:
            raise RuntimeError("Missing expected original asset")
        if set(bundled)&preexisting:
            raise RuntimeError("Bundled file conflicts with original")
        with ZipFile(output,"w") as patched:
            for info in original.infolist():
                patched.writestr(info,replace.get(info.filename,original.read(info)))
            for name,data in bundled.items():
                patched.writestr(name,data)

    with ZipFile(source) as old,ZipFile(output) as new:
        assert new.testzip() is None
        assert set(new.namelist())==set(old.namelist())|set(bundled)
        for name in old.namelist():
            if name not in replace:
                assert old.getinfo(name).CRC==new.getinfo(name).CRC,name
        route=new.read(PREFIX+"js/family-fun-route.js").decode()
        index=new.read(PREFIX+"index.html").decode()
        assert 'family-gallery-feature fb-mobile-gallery-shortcut' in route
        assert "fb-mobile-bundled.css" in index
        assert "fb-mobile-video-controls.js" in index
        assert "fb-mobile-safe-area.js" in index
        assert "fb-mobile-social-reactions.js" in index
        assert "fb-mobile-ota.js" in index
        for name in BASE["DESKTOP_ONLY"]:
            assert ("js/"+name+".js") not in index
    print("PASS: original native APK content preserved (only web assets modified)")
    print("PASS: Family Video Gallery button, standalone navigation and playback embedded")
    print("PASS: reaction viewer, menu, thumbnail cache and touch swipe fixes embedded")
    print("PASS: multi-device status inset fallback and optional OTA beyond v7")
    print("Unsigned APK:",output)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",type=Path,default=Path("downloads/FamilyBook.apk"))
    parser.add_argument("--output",type=Path,default=Path("build/embedded-gallery/FamilyBook-embedded-gallery-unsigned.apk"))
    args=parser.parse_args()
    patch_apk(args.source,args.output)
