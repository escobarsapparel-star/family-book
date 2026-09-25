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
startUpdates({ Capacitor, updater: CapacitorUpdater, App, http: CapacitorHttp, runtime: __FB_RUNTIME__, bundledVersion: __FB_BUNDLE_VERSION__ });
