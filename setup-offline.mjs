// setup-offline.mjs — make ZOOMVERSE fully offline (needed for the Android APK).
// Downloads Three.js into assets/ and rewrites every page's importmap to the local copy.
// Run with:  node setup-offline.mjs   (from the folder containing the .html files)
import { readdirSync, readFileSync, writeFileSync, createWriteStream, mkdirSync, existsSync } from "fs";
import https from "https";

const THREE_URL = "https://unpkg.com/three@0.160.0/build/three.module.js";
const CDN = "https://unpkg.com/three@0.160.0/build/three.module.js";
const LOCAL = "./assets/three.module.js";

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error("HTTP " + res.statusCode + " for " + url));
      const file = createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

(async () => {
  if (!existsSync("assets")) mkdirSync("assets");
  console.log("Downloading Three.js → assets/three.module.js ...");
  await download(THREE_URL, "assets/three.module.js");
  console.log("Done.");

  let changed = 0;
  for (const f of readdirSync(".").filter((n) => n.endsWith(".html"))) {
    const src = readFileSync(f, "utf8");
    if (src.includes(CDN)) {
      writeFileSync(f, src.split(CDN).join(LOCAL));
      console.log("Rewrote importmap in " + f);
      changed++;
    }
  }
  console.log(`\nOffline setup complete. ${changed} page(s) now use the local Three.js.`);
  console.log("The game no longer needs the internet — ready to wrap as an APK.");
})().catch((e) => { console.error("Failed:", e.message); process.exit(1); });
