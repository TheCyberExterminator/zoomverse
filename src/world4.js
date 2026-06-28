import * as THREE from "three";
import { starShape } from "./playerCar.js";

const TL = new THREE.TextureLoader();
function tiled(file, repeat) {
  const t = TL.load("assets/" + file);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Planet 4: Robot Factory Run — a loop through a toy factory with MOVING hazards.
export class FactoryWorld {
  constructor(scene) {
    this.scene = scene;
    this.stars = [];
    this.boostPads = [];
    this.ramps = [];
    this.hazards = [];      // {pos} moving stampers
    this._haz = [];         // internal {mesh, baseAngle, phase, amp}
    this.R = 35;
    this.lane = 4.5;        // road half-width (guard-rail limit)
    this._t = 0;
    this._lights();
    this._sky();
    this._ground();
    this._stars();
    this._boost();
    this._ramp();
    this._hazards();
    this._decor();
  }

  _lights() {
    this.scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x202030, 0.95));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.3);
    sun.position.set(18, 42, 16); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const d = 70;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d; sun.shadow.camera.far = 160;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x27C4F2, 0.6);
    rim.position.set(-22, 14, -18); this.scene.add(rim);
  }

  _sky() {
    this.scene.background = new THREE.Color(0x14182e);
    this.scene.fog = new THREE.Fog(0x14182e, 70, 160);
  }

  _ground() {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(120, 64),
      new THREE.MeshStandardMaterial({ color: 0x8b93b8, roughness: 1, map: tiled("tex-panel.png", 14) }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; this.scene.add(floor);

    const road = new THREE.Mesh(new THREE.RingGeometry(this.R - 5, this.R + 5, 96),
      new THREE.MeshStandardMaterial({ color: 0xc7cede, roughness: 0.9, map: tiled("tex-road.png", 8) }));
    road.rotation.x = -Math.PI / 2; road.position.y = 0.02; road.receiveShadow = true; this.scene.add(road);

    // glowing guard rails along both road edges
    [this.R - this.lane, this.R + this.lane].forEach((rad) => {
      const rail = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.3, 8, 140),
        new THREE.MeshStandardMaterial({ color: 0xffa53a, emissive: 0x6a3a00, emissiveIntensity: 0.7 }));
      rail.rotation.x = -Math.PI / 2; rail.position.y = 0.45; this.scene.add(rail);
    });

    const line = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    line.rotation.x = -Math.PI / 2; line.position.set(0, 0.03, this.R); this.scene.add(line);
  }

  _stars() {
    const starMat = new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0xE0A516, emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.3 });
    const geo = new THREE.ExtrudeGeometry(starShape(0.85), { depth: 0.2, bevelEnabled: false });
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + 0.12;
      const m = new THREE.Mesh(geo, starMat);
      m.position.set(Math.cos(a) * this.R, 1.5, Math.sin(a) * this.R);
      m.castShadow = true; this.scene.add(m);
      this.stars.push({ mesh: m, collected: false });
    }
  }

  _boost() {
    const padMat = new THREE.MeshStandardMaterial({ color: 0x0c1430, emissive: 0x27C4F2, emissiveIntensity: 1.2 });
    [0.6, 2.8, 5.0].forEach((a) => {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 5), padMat);
      const x = Math.cos(a) * this.R, z = Math.sin(a) * this.R;
      pad.position.set(x, 0.06, z); pad.rotation.y = -a; this.scene.add(pad);
      this.boostPads.push({ mesh: pad, pos: new THREE.Vector3(x, 0, z) });
    });
  }

  _ramp() {
    const ra = 4.1, rx = Math.cos(ra) * this.R, rz = Math.sin(ra) * this.R;
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(7, 0.7, 4),
      new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0x5a3f00, emissiveIntensity: 0.5, roughness: 0.6 }));
    ramp.position.set(rx, 0.32, rz); ramp.rotation.y = -ra; ramp.rotation.x = -0.2; ramp.castShadow = true;
    this.scene.add(ramp);
    this.ramps.push({ pos: new THREE.Vector3(rx, 0, rz) });
  }

  _hazards() {
    // 5 stamping blocks that slide across the track on a timer
    const mat = new THREE.MeshStandardMaterial({ color: 0xff7a3a, emissive: 0x5a2400, emissiveIntensity: 0.5, roughness: 0.6 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.9;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3, 2.4), mat);
      mesh.castShadow = true; this.scene.add(mesh);
      const h = { mesh, baseAngle: a, phase: i * 1.3, amp: 4 };
      this._haz.push(h);
      const pos = new THREE.Vector3();
      this.hazards.push({ pos });
      this._haz[i].posRef = this.hazards[i].pos;
    }
  }

  _decor() {
    // gears + glowing panels around the factory
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const r = this.R + 13 + (i % 2) * 5;
      const gear = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1, 12),
        new THREE.MeshStandardMaterial({ color: 0x8893b8, metalness: 0.5, roughness: 0.5, map: tiled("tex-panel.png", 1) }));
      gear.rotation.x = Math.PI / 2; gear.position.set(Math.cos(a) * r, 3, Math.sin(a) * r);
      gear.castShadow = true; this.scene.add(gear);
    }
  }

  animate(dt) {
    this._t += dt;
    for (const s of this.stars) if (!s.collected) s.mesh.rotation.y += dt * 2;
    for (const h of this._haz) {
      const off = Math.sin(this._t * 1.4 + h.phase) * h.amp;
      const x = Math.cos(h.baseAngle) * (this.R + off), z = Math.sin(h.baseAngle) * (this.R + off);
      h.mesh.position.set(x, 1.5, z);
      h.mesh.rotation.y += dt * 2;
      h.posRef.set(x, 0, z);
    }
  }
}
