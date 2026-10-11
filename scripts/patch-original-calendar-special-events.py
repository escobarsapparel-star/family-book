#!/usr/bin/env python3
"""Build Family Book Android Calendar + Special Event detail repair APK.

Start from stable Dark-default Midnight Lite package. Add the current website's
special celebration cards, restore the missing event-day route binding in the
original APK's app.js, and recover a Calendar grid that fails to initialise.
Keep native components, family data, security rules and video/camera untouched.
"""
from __future__ import annotations
import argparse
import re
import runpy
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

BASE=runpy.run_path("scripts/patch-original-midnight-performance.py")
PREFIX="assets/public/"
INDEX=PREFIX+"index.html"
APP=PREFIX+"js/app.js"
CAL=PREFIX+"js/fb-native-calendar-recovery.js"
EVENT=PREFIX+"js/event-day.js"
EVENT_CSS=PREFIX+"css/event-day.css"

def patch(source:Path,target:Path)->None:
    target.parent.mkdir(parents=True,exist_ok=True)
    baseline=target.parent/"FamilyBook-midnight-lite-base-unsigned.apk"
    BASE["patch"](source,baseline)
    event=Path("js/event-day.js").read_bytes()
    style=Path("css/event-day.css").read_bytes()
    calendar=Path("scripts/assets/fb-native-calendar-recovery.js").read_bytes()
    for label,data,needle in [
        ("event-day.js",event,b"window.FB_EVENT_DAY="),
        ("event-day.css",style,b".fb-event-day-card"),
        ("calendar recovery",calendar,b"window.FB_CALENDAR"),
    ]:
        if needle not in data:raise RuntimeError("Expected "+label+" implementation absent")
    with ZipFile(baseline) as old:
        html=old.read(INDEX).decode()
        app=old.read(APP).decode()
        if EVENT in old.namelist() or CAL in old.namelist():
            raise RuntimeError("Event-day or calendar recovery was already installed")
        # Old APK go() misses the new event-day detail enhancer entirely.
        cal_anchor='if(r==="calendar"||r==="add-event"||r.startsWith("edit-event:")||r.startsWith("view-event:"))FB_CALENDAR.bindRoute(r);'
        if app.count(cal_anchor)!=1:raise RuntimeError("Original Calendar route binding changed")
        app=app.replace(cal_anchor,cal_anchor+'\n  window.FB_EVENT_DAY?.bindRoute?.(r);')

        # Load the event module only after FB_CALENDAR and organizer are set up,
        # before app.js evaluates and creates the first Home view.
        app_pattern=r'(<script\s+src="js/app\.js[^"]*"\s*></script>)'
        match=re.search(app_pattern,html)
        if not match:raise RuntimeError("Original app.js entrypoint not found")
        before=html[:match.start()]
        if 'src="js/calendar.js' not in before or 'src="js/organizer-data.js' not in before:
            raise RuntimeError("Event-day would load before the necessary data modules")
        html=html[:match.start()]+'<script src="js/event-day.js"></script>\n'+html[match.start():]
        if html.count("</head>")!=1 or html.count("</body>")!=1:
            raise RuntimeError("Unexpected APK HTML")
        html=html.replace("</head>",'<link rel="stylesheet" href="css/event-day.css">\n</head>')
        html=html.replace("</body>",'<script src="js/fb-native-calendar-recovery.js"></script>\n</body>')
        updates={INDEX:html.encode(),APP:app.encode()}
        additions={EVENT:event,CAL:calendar}
        if EVENT_CSS in old.namelist():
            updates[EVENT_CSS]=style
        else:
            additions[EVENT_CSS]=style
        with ZipFile(target,"w") as new:
            for member in old.infolist():
                new.writestr(member,updates.get(member.filename,old.read(member)))
            for name,data in additions.items():
                new.writestr(name,data,compress_type=ZIP_DEFLATED)
    with ZipFile(baseline) as old,ZipFile(target) as new:
        assert new.testzip() is None
        assert set(new.namelist())==set(old.namelist())|set(additions)
        for info in old.infolist():
            if info.filename not in updates and new.getinfo(info.filename).CRC!=info.CRC:
                raise RuntimeError("Unrelated APK member changed: "+info.filename)
        index=new.read(INDEX).decode()
        app=new.read(APP).decode()
        event_code=new.read(EVENT).decode()
        recovery=new.read(CAL).decode()
        assert 'window.FB_EVENT_DAY?.bindRoute?.(r);' in app
        assert index.index('src="js/event-day.js"') < index.index('src="js/app.js')
        assert 'src="js/fb-native-calendar-recovery.js"' in index
        assert "fb-midnight-android-performance.css" in index
        assert "fb-platform-owner-activity.js" in index
        assert "fb-settings-ota-updater.js" in index
        assert "fb-mobile-video-controls.js" in index
        assert 'localStorage.getItem("fb_visual_theme")||"classic"' in index
        assert 'theme:"dark"' in new.read(PREFIX+"js/settings.js").decode()
        assert "platformOwner=String(u.supabaseUserId||'')" in new.read(PREFIX+"js/profile-avatar-route.js").decode()
        assert "window.FB_EVENT_DAY" in event_code
        assert "view-event:" in recovery
        assert "calendarGrid" in recovery and "calendarUpcoming" in recovery
        assert "getUpcoming" in recovery and "getEvents" not in recovery
    print("PASS: special birthday/anniversary/event cards & CSS embedded in APK")
    print("PASS: Calendar binding recovery and countdown event detail routing embedded")
    print("PASS: original Dark default, Midnight Lite, secure admin, gallery, OTA preserved")
    print("PASS: all original native binaries and unrelated web assets unchanged")
    print("Unsigned APK:",target)

if __name__=="__main__":
    arg=argparse.ArgumentParser()
    arg.add_argument("--source",type=Path,default=Path("downloads/FamilyBook.apk"))
    arg.add_argument("--output",type=Path,default=Path("build/calendar-special/FamilyBook-calendar-special-unsigned.apk"))
    args=arg.parse_args()
    patch(args.source,args.output)
