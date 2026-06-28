import * as THREE from "three";
import { starShape } from "./playerCar.js";

const TL = new THREE.TextureLoader();
function tiled(file, repeat) {
  const t = TL.load("assets/" + file);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Planet 3: Ocean Tunnel Dash — an enclosed glass-tunnel loop with slow-bubble hazards.
// Same interface as World/GalaxyWorld, plus .hazards (slow bubbles).
export class OceanWorld {
  constructor(scene) {
    this.scene = scene;
    this.stars = [];
    this.boostPads = [];
    this.ramps = [];        // tunnel = no jumps
    this.hazards = [];      // {pos} slow bubbles
    this.bubbleMeshes = [];
    this.R = 35;
    this._lights();
    this._sky();
    this._tunnel();
    this._stars();
    this._boost();
    this._hazards();
    this._decor();
  }

  _lights() {
    this.scene.add(new THREE.HemisphereLight(0x9fe8ff, 0x06304a, 1.0));
    const sun = new THREE.DirectionalLight(0xdffaff, 1.2);
    sun.position.set(15, 45, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const d = 70;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d; sun.shadow.camera.far = 160;
    this.scene.add(sun);
  }

  _sky() {
    this.scene.background = new THREE.Color(0x06384f);
    this.scene.fog = new THREE.Fog(0x06384f, 60, 150);
  }

  _tunnel() {
    // translucent glass tube around the loop
    const glass = new THREE.Mesh(
      new THREE.TorusGeometry(this.R, 6, 16, 120),
      new THREE.MeshStandardMaterial({ color: 0x7fe6ff, transparent: true, opacity: 0.18, metalness: 0.3, roughness: 0.1, side: THREE.DoubleSide })
    );
    glass.rotation.x = -Math.PI / 2; glass.position.y = 3; this.scene.add(glass);

    // road inside the tube
    const road = new THREE.Mesh(
      new THREE.RingGeometry(this.R - 4, this.R + 4, 96),
      new THREE.MeshStandardMaterial({ color: 0xbfeaf2, roughness: 0.85, map: tiled("tex-road.png", 9) })
    );
    road.rotation.x = -Math.PI / 2; road.position.y = 0; road.receiveShadow = true;
    this.scene.add(road);

    // outer sea floor
    const floor = new THREE.Mesh(new THREE.CircleGeometry(120, 64),
      new THREE.MeshStandardMaterial({ color: 0x0a4a63, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.4; floor.receiveShadow = true;
    this.scene.add(floor);

    // start / finish line
    const line = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    line.rotation.x = -Math.PI / 2; line.position.set(0, 0.03, this.R); this.scene.add(line);
  }

  _stars() {
    const starMat = new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0xE0A516, emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.3 });
    const geo = new THREE.ExtrudeGeometry(starShape(0.85), { depth: 0.2, bevelEnabled: false });
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + 0.1;
      const m = new THREE.Mesh(geo, starMat);
      m.position.set(Math.cos(a) * this.R, 1.5, Math.sin(a) * this.R);
      m.castShadow = true; this.scene.add(m);
      this.stars.push({ mesh: m, collected: false });
    }
  }

  _boost() {
    const padMat = new THREE.MeshStandardMaterial({ color: 0x0c1430, emissive: 0x27C4F2, emissiveIntensity: 1.2 });
    [0.8, 3.0, 5.2].forEach((a) => {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 4.5), padMat);
      const x = Math.cos(a) * this.R, z = Math.sin(a) * this.R;
      pad.position.set(x, 0.06, z); pad.rotation.y = -a; this.scene.add(pad);
      this.boostPads.push({ mesh: pad, pos: new THREE.Vector3(x, 0, z) });
    });
  }

  _hazards() {
    // drifting slow-bubbles on the road
    const mat = new THREE.MeshStandardMaterial({ color: 0xbfefff, transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.2 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.55;
      const off = (i % 2 ? 1 : -1) * 1.6;
      const x = Math.cos(a) * (this.R + off), z = Math.sin(a) * (this.R + off);
      const b = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), mat);
      b.position.set(x, 1.5, z); this.scene.add(b);
      this.bubbleMeshes.push(b);
      this.hazards.push({ pos: new THREE.Vector3(x, 0, z) });
    }
  }

  _decor() {
    const colors = [0xff9a4a, 0x4affd0, 0xff6db0, 0xffe24a];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = this.R + 12 + (i % 2) * 6;
      const coral = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4 + Math.random() * 3, 7),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.7 }));
      coral.position.set(Math.cos(a) * r, 1.5, Math.sin(a) * r); coral.castShadow = true;
      this.scene.add(coral);
    }
  }

  animate(dt) {
    this._t = (this._t || 0) + dt;
    for (const s of this.stars) if (!s.collected) s.mesh.rotation.y += dt * 2;
    for (let i = 0; i < this.bubbleMeshes.length; i++) {
      this.bubbleMeshes[i].position.y = 1.5 + Math.sin(this._t * 2 + i) * 0.3;
    }
  }
}
