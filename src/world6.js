import * as THREE from "three";
import { starShape } from "./playerCar.js";

const TL = new THREE.TextureLoader();
function tiled(file, repeat) {
  const t = TL.load("assets/" + file);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Planet 6: Star Castle Finale — a grand galaxy-castle loop combining rings, ramps & boost.
export class CastleWorld {
  constructor(scene) {
    this.scene = scene;
    this.stars = [];
    this.boostPads = [];
    this.ramps = [];
    this.R = 38;
    this.lane = 4.5;      // road half-width (guard-rail limit)
    this._lights();
    this._sky();
    this._road();
    this._castle();
    this._stars();
    this._rings();
    this._boost();
    this._ramps();
  }

  _lights() {
    this.scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x141040, 0.95));
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.4);
    sun.position.set(20, 50, 18); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const d = 80;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d; sun.shadow.camera.far = 180;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0xF2B43A, 0.6);
    rim.position.set(-20, 16, -22); this.scene.add(rim);
  }

  _sky() {
    this.scene.background = new THREE.Color(0x0a0a30);
    this.scene.fog = new THREE.Fog(0x0a0a30, 100, 220);
    const g = new THREE.BufferGeometry();
    const n = 1200, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 160 + Math.random() * 50, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
      a[i*3] = r * Math.sin(p) * Math.cos(t); a[i*3+1] = r * Math.cos(p); a[i*3+2] = r * Math.sin(p) * Math.sin(t);
    }
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    this.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9 })));
  }

  _road() {
    const road = new THREE.Mesh(new THREE.RingGeometry(this.R - 5, this.R + 5, 120),
      new THREE.MeshStandardMaterial({ color: 0xcfd6ea, roughness: 0.8, map: tiled("tex-road.png", 10) }));
    road.rotation.x = -Math.PI / 2; road.receiveShadow = true; this.scene.add(road);

    // glowing gold guard rails along both road edges
    [this.R - this.lane, this.R + this.lane].forEach((rad) => {
      const rail = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.3, 8, 150),
        new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0x6a4d00, emissiveIntensity: 0.7 }));
      rail.rotation.x = -Math.PI / 2; rail.position.y = 0.45; this.scene.add(rail);
    });

    const line = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.4), new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0x5a3f00, emissiveIntensity: 0.5 }));
    line.rotation.x = -Math.PI / 2; line.position.set(0, 0.04, this.R); this.scene.add(line);
  }

  _castle() {
    // central galaxy castle: towers + a big gold star
    const wall = new THREE.MeshStandardMaterial({ color: 0x2a3a82, metalness: 0.3, roughness: 0.6 });
    const keep = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 14, 8), wall);
    keep.position.y = 7; keep.castShadow = true; this.scene.add(keep);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 18, 8), wall);
      tower.position.set(Math.cos(a) * 9, 9, Math.sin(a) * 9); tower.castShadow = true; this.scene.add(tower);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3, 8),
        new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0x6a4d00, emissiveIntensity: 0.4 }));
      cap.position.set(Math.cos(a) * 9, 19.5, Math.sin(a) * 9); this.scene.add(cap);
    }
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(3), { depth: 0.6, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0xE0A516, emissiveIntensity: 0.9 }));
    star.position.set(0, 20, 0); this.scene.add(star);
    this._castleStar = star;
  }

  _stars() {
    const starMat = new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0xE0A516, emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.3 });
    const geo = new THREE.ExtrudeGeometry(starShape(0.85), { depth: 0.2, bevelEnabled: false });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.1;
      const m = new THREE.Mesh(geo, starMat);
      m.position.set(Math.cos(a) * this.R, 1.5, Math.sin(a) * this.R);
      m.castShadow = true; this.scene.add(m);
      this.stars.push({ mesh: m, collected: false });
    }
  }

  _rings() {
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0xE0A516, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.3 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.5;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.32, 10, 28), ringMat);
      ring.position.set(Math.cos(a) * this.R, 2.6, Math.sin(a) * this.R); ring.rotation.y = -a;
      ring.castShadow = true; this.scene.add(ring);
      this.stars.push({ mesh: ring, collected: false, ring: true });
    }
  }

  _boost() {
    const padMat = new THREE.MeshStandardMaterial({ color: 0x0c1430, emissive: 0x27C4F2, emissiveIntensity: 1.2 });
    [0.9, 3.2, 5.3].forEach((a) => {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 5), padMat);
      const x = Math.cos(a) * this.R, z = Math.sin(a) * this.R;
      pad.position.set(x, 0.06, z); pad.rotation.y = -a; this.scene.add(pad);
      this.boostPads.push({ mesh: pad, pos: new THREE.Vector3(x, 0, z) });
    });
  }

  _ramps() {
    [1.8, 4.4].forEach((ra) => {
      const rx = Math.cos(ra) * this.R, rz = Math.sin(ra) * this.R;
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(7, 0.8, 4.5),
        new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0x5a3f00, emissiveIntensity: 0.5, roughness: 0.6 }));
      ramp.position.set(rx, 0.36, rz); ramp.rotation.y = -ra; ramp.rotation.x = -0.24; ramp.castShadow = true;
      this.scene.add(ramp);
      this.ramps.push({ pos: new THREE.Vector3(rx, 0, rz) });
    });
  }

  animate(dt) {
    for (const s of this.stars) if (!s.collected) s.mesh.rotation.y += dt * (s.ring ? 0.6 : 2);
    if (this._castleStar) this._castleStar.rotation.z += dt * 0.5;
  }
}
