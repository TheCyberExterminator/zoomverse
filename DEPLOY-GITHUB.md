# Deploy ZOOMVERSE to GitHub Pages (play in a browser)

The game is plain static HTML/JS — perfect for GitHub Pages. The site root opens
the **Galaxy Hub** (`index.html`).

## Steps

1. Create a new GitHub repository (e.g. `zoomverse`).
2. Put **all the contents of this `zoomverse-starter` folder at the repo root**
   (so `index.html`, `src/`, `assets/`, etc. sit at the top of the repo).
3. Commit and push:
   ```bash
   git init
   git add .
   git commit -m "Noah & Dad: ZOOMVERSE prototype"
   git branch -M main
   git remote add origin https://github.com/<you>/zoomverse.git
   git push -u origin main
   ```
4. On GitHub: **Settings → Pages**.
5. Under **Build and deployment → Source**, choose **Deploy from a branch**.
6. Select branch **main** and folder **/ (root)**, then **Save**.
7. Wait ~1 minute. Your game is live at:
   `https://<you>.github.io/zoomverse/`

No build step, no Actions workflow needed — it's static files.

## Notes

- Three.js loads from a CDN (unpkg) via the importmap in each HTML page, so the
  hosted game needs internet on first load. To make it fully self-contained,
  download `three.module.js` into `assets/` and point each importmap at the local
  copy (see BUILD-APK.md — same step).
- Progress (stars, upgrades, best times, settings) is saved in the player's
  browser via `localStorage`, per device.
