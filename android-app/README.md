# Family Book Android updates

The website remains at the repository root. `android-app` is the native Capacitor
wrapper from the supplied Android Studio project, with a self-hosted updater.
There is no Capgo subscription or account requirement.

## One-time build on your existing Windows PC

The easiest route for the current Family Book test install is the included
PowerShell builder. It deliberately builds a **debug APK on your own PC**, so
Gradle uses that PC's existing Android debug signing key. If the currently
installed Family Book app was also built as a debug APK on that same PC, Android
will accept it as an in-place update and keep the app's data.

1. Download this repository (Code > Download ZIP) and extract it.
2. Install Node.js 22 or newer if it is not already installed.
3. If the original project uses Firebase push, copy your existing
   `android/app/google-services.json` to the same place in this project locally.
4. Open PowerShell in `android-app` and run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\build-updater-windows.ps1
   ```

   The finished APK is copied to:

   ```text
   android-app\dist\FamilyBook-Updater-1.1-debug.apk
   ```

5. Install that APK **over** the current Family Book app. Do not uninstall the
   current app first. To build and install over USB in one command, after enabling
   USB debugging and making `adb` available, run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\build-updater-windows.ps1 -Install
   ```

If Android reports that the signatures do not match, stop there. The currently
installed APK was signed with a different key, so use the original release/debug
key rather than uninstalling the app. The manual Android Studio route is still
available: `npm ci`, `npm run sync:android`, `npm run open:android`, then
build/sign with the original key.

Use JDK 21 and Android SDK 36 for the Android project.

The version code is now 2 / version 1.1. No signing keys or passwords are stored
in this repository. CI's release APK is unsigned and must be signed with your
existing key before installation. It is not the public download APK yet.

## After installation

Every push to `main` runs **Publish Android interface updates**. It packages the
current website plus Android navigation/back-button enhancements. Three external
JavaScript dependencies are included locally so startup does not depend on CDNs.
GitHub Releases hosts a ZIP and a small `latest.json` feed. The ZIP is uploaded
before the manifest changes. Existing website publishing is unchanged.

The app checks after a healthy startup and when returning online/to foreground
(at most once every five minutes). It downloads compatible updates in the
background, verifies SHA-256, and stages them for the next cold launch. Fully
close and reopen the app after a download; simply changing tabs does not apply it.
No active editor or upload is deliberately reloaded by the JavaScript updater.
Offline or failed downloads leave the working version in place. A bundle that
fails the 60-second startup health check rolls back through the native plugin;
failed bundle records are retained so the same broken update is not retried.

## Native compatibility and rollback

The build hashes native source/config and resolved Capacitor/Capgo versions into
an Android runtime ID. Updates are isolated into a release named
`android-web-<runtime>`. Changes to native plugins, permissions or native source
require rebuilding/installing an APK. Web-only changes keep the same runtime.

To undo a bad web release, revert the offending website commit and push `main`.
This publishes a new bundle version with the corrected code. Do not overwrite a
ZIP with different contents under an existing version. The SHA-256 protects
integrity; HTTPS and access to this GitHub repository are the publishing trust
boundary. Keep repository write access restricted to trusted maintainers.

The website service worker is disabled in native bundles to prevent old cached
files from masking an update. Account and family data continue to use the same
backend and app origin; the updater does not clear app storage.

## Verification

`npm test` covers malformed/wrong-runtime metadata, download failure, checksum
handoff, pending updates and failed-bundle retry prevention. `npm run sync:android`
validates packaging and native plugin registration. GitHub's **Build Android
updater APK** compiles an unsigned APK. Real-device checks are still required:
install over the existing APK, verify login/camera/back navigation, publish a
small visible web change, download it, cold-launch, then test offline startup and
rollback in a separate test build. Unit tests do not prove device rollback.
