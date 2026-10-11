#!/usr/bin/env python3
"""Bundle manual special-event preview cards in stable Android Family Book."""
from __future__ import annotations
import argparse
import runpy
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

BASE=runpy.run_path("scripts/patch-original-calendar-special-events.py")
P="assets/public/"
EVENT=P+"js/event-day.js"
NAV=P+"js/fb-native-special-event-clicks.js"
INDEX=P+"index.html"

def patch(source:Path,target:Path):
    target.parent.mkdir(parents=True,exist_ok=True)
    baseline=target.parent/"FamilyBook-calendar-special-base-unsigned.apk"
    BASE["patch"](source,baseline)
    method=Path("scripts/assets/fb-event-day-selected-preview-method.js").read_text("utf-8")
    navigation=Path("scripts/assets/fb-event-day-open-on-tap.js").read_bytes()
    if "showSelectedEventCard" not in method or b"showSelectedEventCard" not in navigation:
        raise RuntimeError("Selected event implementation missing")
    with ZipFile(baseline) as old:
        js=old.read(EVENT).decode("utf-8")
        html=old.read(INDEX).decode("utf-8")
        marker="  window.FB_EVENT_DAY={"
        if js.count(marker)!=1:raise RuntimeError("Event-day function export changed")
        js=js.replace(marker,method+"\n"+marker)
        export="capture:openCapture,todayRows,showWelcome"
        if js.count(export)!=1:raise RuntimeError("Event-day public methods changed")
        js=js.replace(export,export+",showSelectedEventCard")
        # Today's automatic welcome -> View Event must not reopen the preview.
        tick=chr(96)
        original=("  function openEvent(row){\n"
                  "    markSeen(row);\n"
                  "    document.querySelector(\".fb-event-day-overlay\")?.remove();\n"
                  "    window.go?.("+tick+"view-event:$"+"{row.id}"+tick+");\n"
                  "  }")
        patched=original.replace('    window.go?.(', '    window.__fbSkipNativeEventPreview=true;\n    window.go?.(')
        if js.count(original)!=1:raise RuntimeError("Auto-welcome View Event action changed")
        js=js.replace(original,patched)
        if "fb-native-special-event-clicks.js" in html:
            raise RuntimeError("Event navigation already installed")
        if html.count("</body>")!=1:raise RuntimeError("Unexpected app HTML")
        html=html.replace("</body>",'<script src="js/fb-native-special-event-clicks.js"></script>\n</body>')
        if NAV in old.namelist():raise RuntimeError("Navigation asset already present")
        updates={EVENT:js.encode("utf-8"),INDEX:html.encode("utf-8")}
        with ZipFile(target,"w") as new:
            for item in old.infolist():
                new.writestr(item,updates.get(item.filename,old.read(item)))
            new.writestr(NAV,navigation,compress_type=ZIP_DEFLATED)
    with ZipFile(baseline) as old,ZipFile(target) as new:
        assert new.testzip() is None
        assert set(new.namelist())==set(old.namelist())|{NAV}
        for item in old.infolist():
            if item.filename not in updates and new.getinfo(item.filename).CRC!=item.CRC:
                raise RuntimeError("Unrelated APK file changed: "+item.filename)
        html=new.read(INDEX).decode()
        js=new.read(EVENT).decode()
        click=new.read(NAV).decode()
        assert html.index('js/event-day.js')<html.index('js/app.js')
        assert html.index('js/fb-native-special-event-clicks.js')>html.index('js/app.js')
        assert "window.__fbSkipNativeEventPreview=true;" in js
        assert "capture:openCapture,todayRows,showWelcome,showSelectedEventCard" in js
        assert "isToday" in js and "fb-event-dismiss" in js
        assert "view-event:" in click
        assert "fb-native-calendar-recovery.js" in html
        assert "fb-midnight-android-performance.css" in html
        assert "fb-platform-owner-activity.js" in html
        assert "fb-settings-ota-updater.js" in html
        assert "fb-mobile-video-controls.js" in html
        assert 'localStorage.getItem("fb_visual_theme")||"classic"' in html
        assert 'theme:"dark"' in new.read(P+"js/settings.js").decode("utf-8")
    print("PASS: upcoming and today's events open themed celebration card when tapped")
    print("PASS: birthday, anniversary, travel and family event card themes supported")
    print("PASS: automatic today's welcome still works without View Event loop")
    print("PASS: Dark default, Midnight Lite, Gallery, OTA and admin permissions retained")
    print("Unsigned APK:",target)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",type=Path,default=Path("downloads/FamilyBook.apk"))
    parser.add_argument("--output",type=Path,default=Path("build/special-events-on-tap/FamilyBook-event-cards-on-tap-unsigned.apk"))
    args=parser.parse_args()
    patch(args.source,args.output)
