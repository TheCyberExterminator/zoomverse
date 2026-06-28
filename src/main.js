import * as THREE from "three";
import { Input } from "./input.js";
import { PlayerCar } from "./playerCar.js";
import { ChaseCamera } from "./chaseCamera.js";
import { World } from "./world.js";
import { GalaxyWorld } from "./world2.js";
import { OceanWorld } from "./world3.js";
import { FactoryWorld } from "./world4.js";
import { RainbowWorld } from "./world5.js";
import { CastleWorld } from "./world6.js";
import { Save } from "./save.js";
import { Audio } from "./audio.js";
import { Particles } from "./particles.js";

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);

const TRACK = window.ZV_TRACK || "toycity";          // set by the HTML page
const RACE_KEY = { galaxy: "race2", ocean: "race3", factory: "race4", rainbow: "race5", castle: "race6" }[TRACK] || "race";
const world = TRACK === "galaxy" ? new GalaxyWorld(scene)
  : TRACK === "ocean" ? new OceanWorld(scene)
  : TRACK === "factory" ? new FactoryWorld(scene)
  : TRACK === "rainbow" ? new RainbowWorld(scene)
  : TRACK === "castle" ? new CastleWorld(scene)
  : new World(scene);
const car = new PlayerCar();
car.gravityEnabled = true;             // race mode uses jump/gravity
scene.add(car.group);
const chase = new ChaseCamera(camera);
const input = new Input();
const particles = new Particles(scene);

// ---------- AI rival racers ----------
const rivals = [];
function makeRival(color, speed, stagger) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 3),
    new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5 }));
  body.position.y = 0.6; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0x5a3f00, emissiveIntensity: 0.4 }));
  head.position.set(0, 1.05, -0.2); g.add(head);
  const wm = new THREE.MeshStandardMaterial({ color: 0x0c1430, emissive: 0x27C4F2, emissiveIntensity: 1.2 });
  [[-0.9, 1], [0.9, 1], [-0.9, -1], [0.9, -1]].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16), wm);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.45, z); g.add(w);
  });
  scene.add(g);
  const r = { group: g, angle: 0, speed, stagger, prog: 0 };
  rivals.push(r);
}
makeRival(0xff6d6d, 1.12, 0.14);   // red StarBot
makeRival(0x6dff9a, 1.28, 0.28);   // green StarBot
let playerProg = 0, prevAng = Math.PI / 2;

function placeRivals() {
  for (const r of rivals) {
    r.group.position.set(Math.cos(r.angle) * world.R, 0, Math.sin(r.angle) * world.R);
    r.group.rotation.y = -r.angle + Math.PI;
  }
}
function updateRivals(dt) {
  for (const r of rivals) { r.angle -= r.speed * dt; r.prog += r.speed * dt; }
  placeRivals();
}

// ---------- game state ----------
let running = false, started = false, finished = false;
let starCount = 0, lap = 1, lapArmed = false;
let countdown = 0, raceTime = 0, goHide = 0, railCd = 0;
let stuntTotal = 0, airTime = 0, spinAccum = 0, prevAir = false, prevHeading = 0;
const START = { x: 0, z: world.R };
const HOLD = { accel: 0, steer: 0, brake: false, boost: false, reset: false };

const el = (id) => document.getElementById(id);
el("starTotal").textContent = world.stars.length;

function startGame() {
  car.reset(0, world.R, Math.PI / 2); // facing along the track (+X direction)
  car.applyUpgrades((Save.load().upgrades) || {}); // garage upgrades affect the car
  chase.offset.z = -(8 + Save.getSettings().camDist * 7); // camera distance setting (negative = behind)
  chase.snap(car.group.position, car.heading);
  starCount = 0; lap = 1; lapArmed = false;
  countdown = 3; raceTime = 0; goHide = 0;
  rivals.forEach((r) => { r.angle = Math.PI / 2 - r.stagger; r.prog = 0; });
  placeRivals(); playerProg = 0; prevAng = Math.PI / 2;
  stuntTotal = 0; airTime = 0; spinAccum = 0; prevAir = false; prevHeading = car.heading;
  el("countdown").textContent = "3"; el("countdown").classList.remove("hidden");
  world.stars.forEach((s) => { s.collected = false; s.mesh.visible = true; });
  updateHud();
  el("menu").classList.add("hidden");
  el("pause").classList.add("hidden");
  el("result").classList.add("hidden");
  el("hud").classList.remove("hidden");
  el("hubLink").classList.remove("hidden");
  if (!matchMedia("(hover:hover)").matches) el("touch").classList.remove("hidden");
  Audio.unlock(); Audio.setMusic(true);
  started = true; running = true; finished = false;
}

function finishRace() {
  running = false; finished = true;
  Audio.win();
  const place = 1 + rivals.filter((r) => r.prog > playerProg).length;
  const total = rivals.length + 1;
  const r = Save.complete(RACE_KEY, starCount);
  const bt = Save.best(RACE_KEY, raceTime);
  const starLine = r.awarded
    ? "+" + r.reward + " stars added to your galaxy total!"
    : starCount + " stars this run (level already cleared).";
  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";
  const finale = RACE_KEY === "race6" ? "🏆 You lit up the Star Castle — Dream Team Galaxy Car unlocked!<br>" : "";
  el("resultText").innerHTML = finale +
    "Finished " + medal + " <b>" + place + " / " + total + "</b> · Time <b>" + raceTime.toFixed(1) + "s</b> · Best <b>" + bt.best.toFixed(1) + "s</b>" +
    (bt.improved ? " 🎉" : "") + "<br>★ " + starCount + " collected · ✨ " + stuntTotal + " stunt · " + starLine;
  el("result").classList.remove("hidden");
}

function pauseGame() {
  if (!running) return;
  running = false;
  el("pause").classList.remove("hidden");
}
function resumeGame() { if (started) { running = true; el("pause").classList.add("hidden"); } }

el("playBtn").onclick = startGame;
el("resumeBtn").onclick = resumeGame;
el("restartBtn").onclick = startGame;
el("resultReplay").onclick = startGame;

// ---------- HUD ----------
let toastTimer = 0;
function toast(msg) { const t = el("toast"); t.textContent = msg; t.classList.add("show"); toastTimer = 1.6; }
function updateHud() {
  el("starCount").textContent = starCount;
  el("lap").textContent = lap;
  el("speed").textContent = Math.round(Math.abs(car.speed) * 3.6);
  el("boostfill").style.width = (car.boostCharge * 100).toFixed(0) + "%";
  el("time").textContent = raceTime.toFixed(1);
  const place = 1 + rivals.filter((r) => r.prog > playerProg).length;
  el("pos").textContent = place;
  el("posTotal").textContent = rivals.length + 1;
  el("stunt").textContent = stuntTotal;
}

// ---------- collisions ----------
const v = new THREE.Vector3();
function checkPickups() {
  const p = car.group.position;
  // stars
  const grab = 2.6 + car.magnet * 0.9; // Magnet upgrade widens pickup radius
  for (const s of world.stars) {
    if (s.collected) continue;
    if (v.copy(s.mesh.position).setY(p.y).distanceTo(p) < grab) {
      s.collected = true; s.mesh.visible = false; starCount++; Audio.star();
      particles.burst(s.mesh.position, 0xF2B43A, 8, { life: 0.6, spread: 2.5, up: 2, grav: 4 });
      if (starCount === world.stars.length) toast("All " + starCount + " stars! 🌟");
      else toast("★ " + starCount);
    }
  }
  // boost pads
  for (const b of world.boostPads) {
    if (v.copy(b.pos).setY(p.y).distanceTo(p) < 4) {
      if (car.boostTimer < 0.05) Audio.boost();
      car.triggerBoost(1.2);
    }
  }
}

function checkRamps() {
  const p = car.group.position;
  for (const rp of (world.ramps || [])) {
    const dx = p.x - rp.pos.x, dz = p.z - rp.pos.z;
    if (!car.airborne && Math.sqrt(dx * dx + dz * dz) < 3.4) {
      car.launch(); Audio.jump();
      particles.burst(car.group.position, 0xffffff, 8, { life: 0.5, spread: 2, up: 1.5, grav: 5 });
    }
  }
}

// slow-bubble hazards (Ocean Tunnel) — cap speed near a bubble
function checkHazards() {
  if (!world.hazards) return;
  const p = car.group.position;
  for (const h of world.hazards) {
    const dx = p.x - h.pos.x, dz = p.z - h.pos.z;
    if (dx * dx + dz * dz < 6.25 && car.speed > 18) {
      car.speed = 18;
      particles.spawn(p, 0xbfefff, { life: 0.4, spread: 1.5, up: 1 });
    }
  }
}

// guard rails — SMOOTH SLIDE: keep the car on the road without ever stopping it.
// The car is projected back onto the road edge, preserving its along-track motion,
// so it slides along the rail and keeps its speed and steering. Never sticks.
function applyGuardRails(dt) {
  railCd -= dt;
  const lane = world.lane || 5;
  const p = car.group.position;
  const r = Math.sqrt(p.x * p.x + p.z * p.z);
  if (r < 0.001) return;
  const inner = world.R - lane, outer = world.R + lane;
  if (r < inner || r > outer) {
    const cr = r < inner ? inner : outer;
    // project onto the edge circle (keeps the new angle = along-track progress)
    p.x = (p.x / r) * cr;
    p.z = (p.z / r) * cr;
    // light visual feedback only — NO braking, NO forced steering
    if (railCd <= 0) { particles.spawn(p, 0x27C4F2, { life: 0.3, spread: 0.8, up: 0.6 }); railCd = 0.15; }
  }
}

function checkLap() {
  const p = car.group.position;
  // arm when the car reaches the far side of the oval
  if (p.z < -world.R + 8) lapArmed = true;
  // count when it returns through the start gate
  if (lapArmed && Math.abs(p.x) < 7 && Math.abs(p.z - START.z) < 4) {
    lapArmed = false;
    if (lap < 2) { lap += 1; toast(lap >= 2 ? "Final lap!" : "Lap " + lap); }
    else if (!finished) { finishRace(); }
  }
}

// ---------- loop ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  input.poll(pauseGame);
  if (running) {
    if (countdown > 0) {
      // 3-2-1-GO start sequence — car is held still
      countdown -= dt;
      if (countdown > 0) el("countdown").textContent = String(Math.ceil(countdown));
      else { el("countdown").textContent = "GO!"; goHide = 0.6; Audio.boost(); }
      car.update(dt, HOLD);
      world.animate(dt);
      chase.update(car.group.position, car.heading, dt);
    } else {
      if (goHide > 0) { goHide -= dt; if (goHide <= 0) el("countdown").classList.add("hidden"); }
      raceTime += dt;
      if (input.state.reset) car.reset(START.x, START.z, Math.PI / 2);
      const boosting = car.update(dt, input.state);
      if (boosting) particles.spawn({ x: car.group.position.x, y: car.group.position.y + 0.3, z: car.group.position.z }, 0x27C4F2, { life: 0.5, spread: 1.2, up: 0.4, size: 0.9 });
      applyGuardRails(dt);
      checkPickups();
      checkRamps();
      checkHazards();
      checkLap();
      updateRivals(dt);
      // stunt scoring while airborne (air time + spin)
      if (car.airborne) {
        airTime += dt;
        let dh = car.heading - prevHeading; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
        spinAccum += Math.abs(dh);
      }
      prevHeading = car.heading;
      if (prevAir && !car.airborne) {                  // landed
        const pts = Math.round(airTime * 120 + spinAccum * 60);
        if (pts > 5) { stuntTotal += pts; toast("✨ +" + pts + " STUNT!"); particles.burst(car.group.position, 0xF2B43A, 10, { life: 0.6, spread: 3, up: 3, grav: 6 }); }
        airTime = 0; spinAccum = 0;
      }
      prevAir = car.airborne;
      // accumulate player progress (radians travelled) for finishing place
      const pa = Math.atan2(car.group.position.z, car.group.position.x);
      let dA = prevAng - pa; if (dA > Math.PI) dA -= 2 * Math.PI; if (dA < -Math.PI) dA += 2 * Math.PI;
      playerProg += Math.abs(dA); prevAng = pa;
      world.animate(dt);
      chase.update(car.group.position, car.heading, dt);
    }
    particles.update(dt);
    updateHud();
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) el("toast").classList.remove("show"); }
  }
  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
