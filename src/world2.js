import * as THREE from "three";
import { starShape } from "./playerCar.js";

const TL = new THREE.TextureLoader();
function tiled(file, repeat) {
  const t = TL.load("assets/" + file);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Planet 2: Galaxy Loop Road — a neon loop floating in space with 5 star rings.
// Same interface as World: .stars, .boostPads, .R, animate(dt).
export class GalaxyWorld {
  constructor(scene) {
    this.scene = scene;
    this.stars = [];
    this.boostPads = [];
    this.ramps = [];
    this.R = 36;
    this._lights();
    this._sky();
    this._road();
    this._rings();
    this._stars();
    this._boost();
    this._decor();
  }

  _lights() {
    this.scene.add(new THREE.HemisphereLight(0x9fc0ff, 0x101040, 0.8));
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.2);
    sun.position.set(20, 50, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const d = 70;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d; sun.shadow.camera.far = 160;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x27C4F2, 0.8);
    rim.position.set(-25, 12, -20); this.scene.add(rim);
  }

  _sky() {
    this.scene.background = new THREE.Color(0x080828);
    this.scene.fog = new THREE.Fog(0x080828, 90, 200);
    const g = new THREE.BufferGeometry();
    const n = 1100, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 150 + Math.random() * 50, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
      a[i*3] = r * Math.sin(p) * Math.cos(t);
      a[i*3+1] = r * Math.cos(p);
      a[i*3+2] = r * Math.sin(p) * Math.sin(t);
    }
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    this.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8 })));
  }

  _road() {
    // the floating neon loop (no ground — it's space)
    const road = new THREE.Mesh(
      new THREE.RingGeometry(this.R - 5, this.R + 5, 96),
      new THREE.MeshStandardMaterial({ color: 0xaeb6e0, roughness: 0.7, map: tiled("tex-road.png", 10) })
    );
    road.rotation.x = -Math.PI / 2; road.position.y = 0; road.receiveShadow = true;
    this.scene.add(road);

    // glowing inner & outer edge rails
    [this.R - 5, this.R + 5].forEach((rad) => {
      const rail = new THREE.Mesh(
        new THREE.TorusGeometry(rad, 0.25, 8, 120),
        new THREE.MeshStandardMaterial({ color: 0x0c1430, emissive: 0x27C4F2, emissiveIntensity: 1.3 })
      );
      rail.rotation.x = -Math.PI / 2; rail.position.y = 0.25; this.scene.add(rail);
    });

    // start / finish line
    const line = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff }));
    line.rotation.x = -Math.PI / 2; line.position.set(0, 0.03, this.R); this.scene.add(line);

    // a decorative ramp arch over the loop (cosmetic in this prototype)
    const ramp = new THREE.Mesh(new THREE.TorusGeometry(6, 0.6, 8, 24, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0x5a3f00, emissiveIntensity: 0.4 }));
    ramp.position.set(Math.cos(3.4) * this.R, 0, Math.sin(3.4) * this.R);
    ramp.rotation.y = -3.4; this.scene.add(ramp);

    // actual launch ramp under the arch
    const rx = Math.cos(3.4) * this.R, rz = Math.sin(3.4) * this.R;
    const launch = new THREE.Mesh(new THREE.BoxGeometry(6, 0.7, 4),
      new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0x5a3f00, emissiveIntensity: 0.5, roughness: 0.6 }));
    launch.position.set(rx, 0.32, rz); launch.rotation.y = -3.4; launch.rotation.x = -0.2;
    launch.castShadow = true; this.scene.add(launch);
    this.ramps.push({ pos: new THREE.Vector3(rx, 0, rz) });
  }

  _rings() {
    // 5 gold star rings to fly through (counted as collectibles)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0xE0A516, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.3 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.35, 10, 28), ringMat);
      ring.position.set(Math.cos(a) * this.R, 2.6, Math.sin(a) * this.R);
      ring.rotation.y = -a; // stand across the road
      ring.castShadow = true; this.scene.add(ring);
      this.stars.push({ mesh: ring, collected: false, ring: true });
    }
  }

  _stars() {
    // 10 extra floating stars between the rings (total 15)
    const starMat = new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0xE0A516, emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.3 });
    const geo = new THREE.ExtrudeGeometry(starShape(0.85), { depth: 0.2, bevelEnabled: false });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const m = new THREE.Mesh(geo, starMat);
      m.position.set(Math.cos(a) * this.R, 1.5, Math.sin(a) * this.R);
      m.castShadow = true; this.scene.add(m);
      this.stars.push({ mesh: m, collected: false });
    }
  }

  _boost() {
    const padMat = new THREE.MeshStandardMaterial({ color: 0x0c1430, emissive: 0x27C4F2, emissiveIntensity: 1.2 });
    [1.2, 3.3, 5.4].forEach((a) => {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 5), padMat);
      const x = Math.cos(a) * this.R, z = Math.sin(a) * this.R;
      pad.position.set(x, 0.06, z); pad.rotation.y = -a; this.scene.add(pad);
      this.boostPads.push({ mesh: pad, pos: new THREE.Vector3(x, 0, z) });
    });
  }

  _decor() {
    // floating toy planets around the loop
    const colors = [0x5dd0ff, 0xff8ad0, 0x8aff8a, 0xffd24a, 0xc78aff];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.5;
      const r = this.R + 22 + (i % 2) * 8;
      const planet = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 2, 24, 16),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.6 }));
      planet.position.set(Math.cos(a) * r, 6 + Math.random() * 10, Math.sin(a) * r);
      planet.castShadow = true; this.scene.add(planet);
    }
  }

  animate(dt) {
    for (const s of this.stars) {
      if (s.collected) continue;
      s.mesh.rotation.y += dt * (s.ring ? 0.6 : 2);
    }
  }
}
