# Build ZOOMVERSE as an Android APK (npm → Android Studio → APK)

The game is a static web app, so we wrap it with **Capacitor** (installed via npm)
to produce a native Android project you open in **Android Studio** and export as an
**APK**.

## What you need
- **Node.js + npm** (https://nodejs.org)
- **Android Studio** (https://developer.android.com/studio) with an Android SDK
- A Java JDK (Android Studio bundles one)

---

## Step 1 — Make the game work offline (one command)
The game loads Three.js from a CDN. An APK should not depend on the internet, so
bundle Three.js locally. A helper script does this automatically:

```bash
cd zoomverse-starter        # the game folder (where the .html files are)
node setup-offline.mjs
```

This downloads `three.module.js` into `assets/` and rewrites every page's
importmap to use the local copy. After it runs, the game needs no internet.
(Do this on a machine WITH internet; afterwards it works fully offline.)

---

## Step 2 — Create the Capacitor wrapper project
```bash
mkdir zoomverse-app && cd zoomverse-app

# copy the game in as the web payload
mkdir www
cp -r /path/to/zoomverse-starter/* www/        # all HTML, src/, assets/, styles.css

# copy the provided config + manifest from packaging/ into the project root
cp www/packaging/package.json .
cp www/packaging/capacitor.config.json .
rm -rf www/packaging                            # keep the wrapper config out of the app

npm install
npx cap add android
npx cap sync
```

> `webDir` is set to `www` in `capacitor.config.json`, and Capacitor loads
> `www/index.html` (the Galaxy Hub) as the app's start page — which is exactly
> what we want.

---

## Step 3 — Open in Android Studio and build the APK
```bash
npx cap open android
```
This opens the generated `android/` project in Android Studio. Then:

1. Let Gradle finish syncing.
2. Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. When it finishes, click **locate** — the file is at:
   `android/app/build/outputs/apk/debug/app-debug.apk`
4. Copy that APK to an Android phone and install it (enable "install from unknown
   sources"). Done — ZOOMVERSE runs as an app.

---

## Step 4 (optional) — A signed release APK for sharing/Play Store
In Android Studio: **Build → Generate Signed Bundle / APK → APK**, create or
choose a keystore, pick **release**, and build. That produces a signed
`app-release.apk` suitable for distribution.

---

## Updating the app later
After changing any game file, re-copy it into `www/` and run:
```bash
npx cap sync
```
then rebuild the APK in Android Studio.

## Notes
- App id: `com.zoomverse.app` — change it in `capacitor.config.json` if you publish.
- Orientation, icon and splash can be customised in the `android/` project.
- All game progress saves on-device via the WebView's localStorage.
