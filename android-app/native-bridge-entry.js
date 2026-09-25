import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { startUpdates } from './update-client.mjs';
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { NavigationBar } from "@capgo/capacitor-navigation-bar";

window.FB_NATIVE = {
  Capacitor,
  App,
  Browser,
  NavigationBar
};

// Apply the native marker immediately while this head script is executing.
// APK-only layout CSS (Android status/navigation safe areas, header offsets and
// mobile sizing) is intentionally scoped to html.native-app so the website is
// never affected. Without this class Android 15 renders the web UI underneath
// the system bars and the app appears incorrectly scaled/positioned.
if (Capacitor?.isNativePlatform?.()) {
  document.documentElement.classList.add("native-app");
  document.documentElement.dataset.fbPlatform = Capacitor.getPlatform?.() || "android";
}

async function applyFamilyBookNavigationBar() {
  if (!Capacitor?.isNativePlatform?.()) return;

  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark";

  try {
    await NavigationBar.setNavigationBarColor({
      color: isDark ? "#151813" : "#D5D6D9",
      dividerColor: isDark ? "#151813" : "#D5D6D9",
      darkButtons: !isDark
    });
  } catch (error) {
    console.warn("Family Book navigation bar update failed:", error);
  }
}

function startNavigationBarSync() {
  applyFamilyBookNavigationBar();

  const observer = new MutationObserver(() => {
    applyFamilyBookNavigationBar();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startNavigationBarSync, {
    once: true
  });
} else {
  startNavigationBarSync();
}
const familyBookUpdates = startUpdates({
  Capacitor,
  updater: CapacitorUpdater,
  App,
  http: CapacitorHttp,
  runtime: __FB_RUNTIME__,
  bundledVersion: __FB_BUNDLE_VERSION__
});
window.FB_NATIVE.updates = familyBookUpdates;
