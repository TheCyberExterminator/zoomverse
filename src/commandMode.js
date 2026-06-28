import * as THREE from "three";

// ----- Command Mode: Dad & Son HQ -----
// Select Builder Bots and send them to repair 3 broken stations using Star Energy.
import { Save } from "./save.js";
import { Audio } from "./audio.js";

const TL = new THREE.TextureLoader();
function tiled(file, repeat) {
  const t = TL.load("assets/" + file);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; return t;
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f3a);
scene.fog = new THREE.Fog(0x0a0f3a, 60, 170);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 400);
camera.position.set(0, 24, 30);
camera.lookAt(0, 0, -2);

// lights
scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x202a55, 1.0));
const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
sun.position.set(18, 38, 20); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45; sun.shadow.camera.far = 120;
scene.add(sun);

// floor
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64),
  new THREE.MeshStandardMaterial({ color: 0x9fb0e6, roughness: 1, map: tiled("tex-space.png", 8) }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const pad = new THREE.Mesh(new THREE.CircleGeometry(20, 48),
  new THREE.MeshStandardMaterial({ color: 0x2a3a72, roughness: 0.9 }));
pad.rotation.x = -Math.PI / 2; pad.position.y = 0.01; pad.receiveShadow = true; scene.add(pad);

// helper: a simple labelled building box
function building(x, z, w, h, d, color, emissive = 0x000000) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.4, roughness: 0.7, map: tiled("tex-panel.png", 1) }));
  m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  return m;
}

// HQ core + dock + star generator
building(0, -14, 10, 5, 6, 0x2440b0, 0x10204a);          // Garage Core
const dock = building(-14, -6, 6, 3, 6, 0x3b4a82);        // Robot Dock
const gen = building(14, -8, 4, 7, 4, 0x123a6e, 0x27C4F2);// Star Generator (glows cyan)
// gold star on the core
const coreStar = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.5, 5),
  new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0x6a4d00, emissiveIntensity: 0.5 }));
coreStar.rotation.x = Math.PI; coreStar.position.set(0, 5.6, -14); scene.add(coreStar);

// ---- pickables ----
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pickables = [];

// ---- stations ----
const stations = [];
function makeStation(x, z, name) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 5),
    new THREE.MeshStandardMaterial({ color: 0x9a6a6a, emissive: 0x551111, emissiveIntensity: 0.6, roughness: 0.8, map: tiled("tex-panel.png", 1) }));
  base.position.set(x, 1.2, z); base.castShadow = base.receiveShadow = true; base.rotation.z = 0.06;
  scene.add(base);

  // progress bar above the station
  const barBg = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.5, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x101830 }));
  barBg.position.set(x, 4.2, z); scene.add(barBg);
  const fill = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.36, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x39d353, emissive: 0x0d5a1d, emissiveIntensity: 0.5 }));
  fill.position.set(x - 2.1, 4.2, z); scene.add(fill);

  const st = { name, x, z, base, fill, progress: 0, done: false };
  base.userData = { kind: "station", ref: st };
  pickables.push(base);
  stations.push(st);
  return st;
}
makeStation(-8, 4, "Wheel Bay");
makeStation(0, 8, "Boost Bay");
makeStation(8, 4, "Paint Bay");

function refreshStation(st) {
  const p = Math.max(0, Math.min(1, st.progress / 100));
  st.fill.scale.x = Math.max(0.001, p);
  st.fill.position.x = st.x - 2.1 + (4.2 * p) / 2;
  if (p >= 1 && !st.done) {
    st.done = true;
    st.base.material.color.set(0x2f7d4f);
    st.base.material.emissive.set(0x0f5a2a);
    st.base.rotation.z = 0;
  }
}

// ---- bots ----
const bots = [];
function makeBot(x, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x2e5be0, metalness: 0.3, roughness: 0.5 }));
  body.position.y = 0.9; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xdfe6ff }));
  head.position.y = 1.7; head.castShadow = true; g.add(head);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x0c1430, emissive: 0x27C4F2, emissiveIntensity: 1.4 }));
  eye.position.set(0, 1.72, 0.42); g.add(eye);
  g.position.set(x, 0, z); scene.add(g);

  const bot = { group: g, body, target: null, working: false, home: new THREE.Vector3(x, 0, z) };
  body.userData = { kind: "bot", ref: bot };
  pickables.push(body);
  bots.push(bot);
  return bot;
}
makeBot(-16, -3); makeBot(-13, -3); makeBot(-15, 0);

// selection ring
const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.4, 24),
  new THREE.MeshBasicMaterial({ color: 0xF2B43A, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; ring.visible = false; scene.add(ring);
let selected = null;

// ---- resource & state ----
let energy = 55; const ENERGY_MAX = 100;
let mode = "menu", won = false, mischiefTimer = 9, repairSnd = 0;

const el = (id) => document.getElementById(id);
let toastT = 0;
function toast(m) { const t = el("cmdtoast"); t.textContent = m; t.classList.add("show"); toastT = 1.6; }

// ---- interaction ----
renderer.domElement.addEventListener("pointerdown", (e) => {
  if (mode !== "play") return;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(pickables, false);
  if (!hits.length) { selected = null; ring.visible = false; return; }
  const ud = hits[0].object.userData;
  if (ud.kind === "bot") {
    selected = ud.ref; ring.visible = true; Audio.click();
  } else if (ud.kind === "station" && selected) {
    if (ud.ref.done) { toast(ud.ref.name + " is already fixed"); return; }
    selected.target = ud.ref;
    toast("Bot → " + ud.ref.name); Audio.click();
  }
});

// ---- UI ----
function startMission() {
  energy = 55; won = false; mischiefTimer = 9; selected = null; ring.visible = false;
  stations.forEach((s) => { s.progress = 0; s.done = false; s.base.material.color.set(0x6b3a3a); s.base.material.emissive.set(0x551111); s.base.rotation.z = 0.06; refreshStation(s); });
  bots.forEach((b) => { b.target = null; b.working = false; b.group.position.copy(b.home); });
  el("menu").classList.add("hidden"); el("win").classList.add("hidden");
  el("cmdhud").classList.remove("hidden");
  Audio.unlock(); Audio.setMusic(true);
  mode = "play";
}
el("playBtn").onclick = startMission;
el("againBtn").onclick = startMission;

// ---- loop ----
const tmp = new THREE.Vector3();
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  gen.material.emissiveIntensity = 0.6 + Math.sin(clock.elapsedTime * 3) * 0.25;
  coreStar.rotation.y += dt;

  if (mode === "play") {
    // energy regen
    energy = Math.min(ENERGY_MAX, energy + 6 * dt);

    // move + work bots
    for (const b of bots) {
      b.working = false;
      if (b.target && !b.target.done) {
        const tx = b.target.x, tz = b.target.z + 4; // stand in front of station
        tmp.set(tx, 0, tz).sub(b.group.position); tmp.y = 0;
        const dist = tmp.length();
        if (dist > 0.4) {
          tmp.normalize();
          b.group.position.addScaledVector(tmp, Math.min(dist, 9 * dt));
          b.group.rotation.y = Math.atan2(tmp.x, tmp.z);
          b.group.position.y = Math.abs(Math.sin(clock.elapsedTime * 10)) * 0.1; // little hop
        } else {
          b.working = true; b.group.position.y = 0;
        }
      } else if (b.target && b.target.done) {
        b.target = null;
      }
    }

    // apply repairs (each working bot spends energy and adds progress)
    let anyWorking = false;
    for (const b of bots) {
      if (b.working && energy > 0) {
        anyWorking = true;
        energy = Math.max(0, energy - 9 * dt);
        b.target.progress = Math.min(100, b.target.progress + 16 * dt);
        refreshStation(b.target);
      }
    }
    repairSnd -= dt;
    if (anyWorking && repairSnd <= 0) { Audio.repair(); repairSnd = 0.32; }

    // cheeky StarBot mischief on an in-progress station
    mischiefTimer -= dt;
    if (mischiefTimer <= 0) {
      mischiefTimer = 11;
      const cand = stations.filter((s) => !s.done && s.progress > 12);
      if (cand.length) {
        const s = cand[(Math.random() * cand.length) | 0];
        s.progress = Math.max(0, s.progress - 14);
        refreshStation(s);
        toast("StarBot mischief at " + s.name + "!");
      }
    }

    // keep ring under selected bot
    if (selected) { ring.position.x = selected.group.position.x; ring.position.z = selected.group.position.z; }

    // HUD
    el("energyFill").style.width = (energy / ENERGY_MAX * 100).toFixed(0) + "%";
    const doneCount = stations.filter((s) => s.done).length;
    el("stationCount").textContent = doneCount + " / 3";

    if (!won && doneCount === 3) { won = true; Save.complete("command", 20); Audio.win(); setTimeout(() => el("win").classList.remove("hidden"), 400); }

    if (toastT > 0) { toastT -= dt; if (toastT <= 0) el("cmdtoast").classList.remove("show"); }
  }

  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
