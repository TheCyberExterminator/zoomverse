import * as THREE from "three";
import { PlayerCar } from "./playerCar.js";
import { Input } from "./input.js";
import { ChaseCamera } from "./chaseCamera.js";
import { Save } from "./save.js";
import { Audio } from "./audio.js";

// ----- Build Mode: Broken Bridge -----
// Place road tiles on a snap grid to span a gap, then test-drive across.

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f3a);
scene.fog = new THREE.Fog(0x0a0f3a, 60, 160);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);

// lights
scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x202a55, 0.95));
const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
sun.position.set(20, 40, 18); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40; sun.shadow.camera.far = 120;
scene.add(sun);

// starfield
(() => {
  const g = new THREE.BufferGeometry(); const n = 500, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i*3] = (Math.random()-.5)*260; a[i*3+1] = Math.random()*90+10; a[i*3+2] = (Math.random()-.5)*260; }
  g.setAttribute("position", new THREE.BufferAttribute(a, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 })));
})();

// glowing star canyon far below
const canyon = new THREE.Mesh(new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x241a4d, emissive: 0x3a2a7a, emissiveIntensity: 0.3 }));
canyon.rotation.x = -Math.PI / 2; canyon.position.y = -26; scene.add(canyon);

// ---- bridge geometry ----
const LANE_W = 4, TILE_D = 2, DECK_Y = 0.2;
const GAP_CENTERS = [-4, -2, 0, 2, 4];   // 5 cells to fill
const NEAR_EDGE = -5, FAR_EDGE = 5;       // stub edges

const roadMat = new THREE.MeshStandardMaterial({ color: 0x33406e, roughness: 0.9 });
const stubMat = new THREE.MeshStandardMaterial({ color: 0x3b4a82, roughness: 0.9 });

function stub(zCenter, len) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(LANE_W, 0.4, len), stubMat);
  m.position.set(0, DECK_Y, zCenter); m.receiveShadow = true; m.castShadow = true;
  scene.add(m);
  // a support pillar under each stub
  const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 26, 1.2), stubMat);
  p.position.set(0, -13, zCenter); scene.add(p);
}
stub(-9, 8);   // near platform (z: -13..-5)
stub(9, 8);    // far platform (z: 5..13)

// finish marker on the far stub
const flag = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W, 1.2),
  new THREE.MeshStandardMaterial({ color: 0xffffff }));
flag.rotation.x = -Math.PI / 2; flag.position.set(0, DECK_Y + 0.21, 11); scene.add(flag);

// occupancy: zCenter -> mesh (or null)
const placed = new Map();

function makeTile(zCenter, kind) {
  let mesh;
  if (kind === "ramp") {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(LANE_W, 0.4, TILE_D),
      new THREE.MeshStandardMaterial({ color: 0x2b6cff, emissive: 0x10307a, emissiveIntensity: 0.5, roughness: 0.7 }));
  } else {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(LANE_W, 0.4, TILE_D), roadMat.clone());
  }
  mesh.position.set(0, DECK_Y, zCenter); mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// ---- ghost preview ----
const ghost = new THREE.Mesh(new THREE.BoxGeometry(LANE_W, 0.4, TILE_D),
  new THREE.MeshStandardMaterial({ color: 0x27C4F2, transparent: true, opacity: 0.45 }));
ghost.position.set(0, DECK_Y, 0); ghost.visible = false; scene.add(ghost);

// ---- interaction ----
const ray = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DECK_Y);
const ndc = new THREE.Vector2();
const hit = new THREE.Vector3();
let mode = "menu";          // menu | build | drive
let piece = "road";
let deleteMode = false;
let hoverZ = null;

function snapZ(z) {
  let best = null, bd = 1.2;
  for (const c of GAP_CENTERS) { const d = Math.abs(z - c); if (d < bd) { bd = d; best = c; } }
  return best;
}

function onPointer(e) {
  if (mode !== "build") return;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(ndc, camera);
  if (ray.ray.intersectPlane(plane, hit)) {
    hoverZ = (Math.abs(hit.x) < LANE_W) ? snapZ(hit.z) : null;
  } else hoverZ = null;

  if (hoverZ === null) { ghost.visible = false; return; }
  ghost.visible = true; ghost.position.z = hoverZ;
  const occupied = placed.has(hoverZ);
  ghost.material.color.set(deleteMode ? 0xff5d5d : (occupied ? 0xffa53a : 0x27C4F2));
}

function onClick(e) {
  if (mode !== "build" || hoverZ === null) return;
  e.preventDefault();
  const occupied = placed.has(hoverZ);
  if (deleteMode || e.button === 2) {
    if (occupied) { scene.remove(placed.get(hoverZ)); placed.delete(hoverZ); }
  } else if (!occupied) {
    placed.set(hoverZ, makeTile(hoverZ, piece));
    Audio.unlock(); Audio.repair();
  }
}

addEventListener("pointermove", onPointer);
renderer.domElement.addEventListener("pointerdown", onClick);
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

// ---- car / drive ----
const car = new PlayerCar();
scene.add(car.group);
car.group.visible = false;
const input = new Input();
const chase = new ChaseCamera(camera);
let vy = 0;

function supportedAt(x, z) {
  if (Math.abs(x) > LANE_W * 0.7) return false;
  if (z <= NEAR_EDGE) return z >= -13;     // near stub
  if (z >= FAR_EDGE) return z <= 13;       // far stub
  const c = snapZ(z);
  return c !== null && placed.has(c);
}

// ---- camera views ----
function buildView() {
  camera.position.set(16, 14, -16);
  camera.lookAt(0, 0, 0);
}

// ---- UI ----
const el = (id) => document.getElementById(id);
function setPiece(p) { piece = p; deleteMode = false; el("pieceRoad").classList.toggle("active", p === "road"); el("pieceRamp").classList.toggle("active", p === "ramp"); el("delBtn").classList.remove("active"); }
el("pieceRoad").onclick = () => setPiece("road");
el("pieceRamp").onclick = () => setPiece("ramp");
el("delBtn").onclick = () => { deleteMode = !deleteMode; el("delBtn").classList.toggle("active", deleteMode); };
el("clearBtn").onclick = () => { for (const m of placed.values()) scene.remove(m); placed.clear(); };

function startBuild() {
  mode = "build"; deleteMode = false; vy = 0;
  Audio.unlock(); Audio.setMusic(true);
  car.group.visible = false;
  el("menu").classList.add("hidden");
  el("win").classList.add("hidden");
  el("toolbar").classList.remove("hidden");
  el("tip").classList.remove("hidden");
  el("driveBtn").textContent = "🚗 Test Drive";
  buildView();
}
el("playBtn").onclick = startBuild;
el("againBtn").onclick = startBuild;

el("driveBtn").onclick = () => {
  if (mode === "drive") { startBuild(); return; }       // back to building
  mode = "drive"; ghost.visible = false; vy = 0;
  car.reset(0, -9, 0);                                   // start on near stub, facing +Z
  car.group.visible = true;
  chase.snap(car.group.position);
  el("tip").textContent = "Drive across! W/S = go, A/D = steer";
  el("driveBtn").textContent = "◀ Back to building";
};

// ---- loop ----
const clock = new THREE.Clock();
let won = false;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (mode === "drive") {
    input.poll();
    if (input.state.reset) { car.reset(0, -9, 0); vy = 0; }
    car.update(dt, input.state);
    const p = car.group.position;
    if (supportedAt(p.x, p.z)) { vy = 0; p.y = 0; }
    else { vy -= 32 * dt; p.y += vy * dt; }              // fall into the canyon
    if (p.y < -28) { el("tip").textContent = "Gap! Build the missing tile, then drive again."; car.reset(0, -9, 0); vy = 0; }
    if (!won && p.z > 11 && p.y > -1) { won = true; Save.complete("build", 15); Audio.win(); setTimeout(() => { el("win").classList.remove("hidden"); }, 300); }
    chase.update(p, car.heading, dt);
  } else {
    won = false;
  }
  renderer.render(scene, camera);
}
buildView();
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
