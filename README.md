# Noah & Dad: ZOOMVERSE 🌌🏎️

A 3D toybox-galaxy racing adventure for the browser — original IP, built with
Three.js. Race six planets, build bridges, command robots, and upgrade your blue
#07 turbo car. The Galaxy Hub (`index.html`) is the home page.

## ▶ Play locally
You need a tiny static server (browsers block ES modules over `file://`):
```bash
python3 -m http.server 8000      # or:  npx serve .
```
Open **http://localhost:8000/** — it loads the Galaxy Hub. Pick a mission.

Controls: **W/A/S/D** or arrows to drive · **Space** boost · **R** reset · **Esc** pause.
On phones, on-screen buttons appear automatically.

## 🗺️ What's inside
| Screen | File | What it is |
|---|---|---|
| Galaxy Hub | `index.html` | Home — picks missions, shows stars & best times |
| Race — Planet 1 | `toycity.html` | Toy City Speedway |
| Race — Planet 2 | `galaxy.html` | Galaxy Loop Road (star rings) |
| Race — Planet 3 | `ocean.html` | Ocean Tunnel Dash (slow bubbles) |
| Race — Planet 4 | `factory.html` | Robot Factory Run (moving stampers) |
| Race — Planet 5 | `rainbow.html` | Rainbow Stunt Planet (5 ramps) |
| Race — Planet 6 | `castle.html` | Star Castle Finale |
| Build | `build.html` | Broken Bridge — place tiles, test-drive |
| Command | `command.html` | Dad & Son HQ — command repair bots |
| Garage | `garage.html` | Spend stars on car upgrades |
| Settings | `settings.html` | Music / SFX volume, camera distance |

Code is in `src/` (one module per system + one per world). Art and textures are
in `assets/`. Progress saves in the browser via `localStorage`.

## 🌐 Deploy to the web (GitHub Pages)
See **DEPLOY-GITHUB.md**. In short: push this folder to a repo, enable Pages on
the `main` branch root, and it goes live — the site root opens the Hub.

## 📱 Build an Android APK
See **packaging/BUILD-APK.md**. It uses **npm + Capacitor → Android Studio → APK**.
First run `node setup-offline.mjs` to bundle Three.js locally (so the app works
without internet), then follow the Capacitor steps.

## 📜 Licence
Original work — MIT (see `../LICENSE`). Inspired by, but containing no code from,
SuperTuxKart, Luanti/Minetest and Warzone 2100 (see `../CREDITS.md`).
Changelog in `CHANGELOG.md`.
