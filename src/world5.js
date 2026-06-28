import * as THREE from "three";
import { starShape } from "./playerCar.js";

const TL = new THREE.TextureLoader();
function tiled(file, repeat) {
  const t = TL.load("assets/" + file);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Planet 5: Rainbow Stunt Planet — bright sky loop packed with ramps for big air.
export class RainbowWorld {
  constructor(scene) {
    this.scene = scene;
    this.stars = [];
    this.boostPads = [];
    this.ramps = [];
    this.R = 36;
    this._lights();
    this._sky();
    this._road();
    this._stars();
    this._boost();
    this._ramps();
    this._decor();
  }

  _lights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x88a0ff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(18, 46, 16); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const d = 72;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d; sun.shadow.camera.far = 170;
    this.scene.add(sun);
  }

  _sky() {
    this.scene.background = new THREE.Color(0x6fc0ff);
    this.scene.fog = new THREE.Fog(0x9fd4ff, 110, 220);
  }

  _road() {
    const road = new THREE.Mesh(new THREE.RingGeometry(this.R - 5, this.R + 5, 120),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, map: tiled("tex-road.png", 10) }));
    road.rotation.x = -Math.PI / 2; road.receiveShadow = true; this.scene.add(road);

    // rainbow rails
    const cols = [0xff5d5d, 0xffa53a, 0xffe24a, 0x6dff8a, 0x5dc8ff, 0xb58aff];
    for (let i = 0; i < cols.length; i++) {
      const rad = this.R - 5 + (i + 0.5) * (10 / cols.length);
      const rail = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.18, 8, 140),
        new THREE.MeshStandardMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: 0.5 }));
      rail.rotation.x = -Math.PI / 2; rail.position.y = 0.18; this.scene.add(rail);
    }

    const line = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    line.rotation.x = -Math.PI / 2; line.position.set(0, 0.04, this.R); this.scene.add(line);
  }

  _stars() {
    const starMat = new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0xE0A516, emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.3 });
    const geo = new THREE.ExtrudeGeometry(starShape(0.85), { depth: 0.2, bevelEnabled: false });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1;
      const m = new THREE.Mesh(geo, starMat);
      m.position.set(Math.cos(a) * this.R, i % 4 === 0 ? 3.2 : 1.5, Math.sin(a) * this.R); // some high (air) stars
      m.castShadow = true; this.scene.add(m);
      this.stars.push({ mesh: m, collected: false });
    }
  }

  _boost() {
    const padMat = new THREE.MeshStandardMaterial({ color: 0x0c1430, emissive: 0x27C4F2, emissiveIntensity: 1.2 });
    [0.4, 3.0, 4.6].forEach((a) => {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 5), padMat);
      const x = Math.cos(a) * this.R, z = Math.sin(a) * this.R;
      pad.position.set(x, 0.06, z); pad.rotation.y = -a; this.scene.add(pad);
      this.boostPads.push({ mesh: pad, pos: new THREE.Vector3(x, 0, z) });
    });
  }

  _ramps() {
    // five launch ramps for a stunt-heavy lap
    const angles = [1.0, 2.0, 3.1, 4.2, 5.3];
    for (const ra of angles) {
      const rx = Math.cos(ra) * this.R, rz = Math.sin(ra) * this.R;
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(7, 0.8, 4.5),
        new THREE.MeshStandardMaterial({ color: 0xff7ad0, emissive: 0x5a1840, emissiveIntensity: 0.5, roughness: 0.6 }));
      ramp.position.set(rx, 0.36, rz); ramp.rotation.y = -ra; ramp.rotation.x = -0.26; ramp.castShadow = true;
      this.scene.add(ramp);
      this.ramps.push({ pos: new THREE.Vector3(rx, 0, rz) });
    }
  }

  _decor() {
    const cols = [0xff5d5d, 0xffe24a, 0x6dff8a, 0x5dc8ff, 0xb58aff];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      const r = this.R + 18 + (i % 2) * 7;
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 2, 16, 12),
        new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.7 }));
      cloud.position.set(Math.cos(a) * r, 8 + Math.random() * 10, Math.sin(a) * r); cloud.castShadow = true;
      this.scene.add(cloud);
    }
  }

  animate(dt) {
    for (const s of this.stars) if (!s.collected) s.mesh.rotation.y += dt * 2;
  }
}
