import * as THREE from "three";
import { starShape } from "./playerCar.js";

// shared texture loader
const TL = new THREE.TextureLoader();
function tiled(file, repeat) {
  const t = TL.load("assets/" + file);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Builds the Toy City Speedway: lights, ground, an oval road, boost pads and stars.
export class World {
  constructor(scene) {
    this.scene = scene;
    this.stars = [];      // {mesh, collected}
    this.boostPads = [];  // {mesh, pos}
    this.ramps = [];      // {pos}
    this.R = 34;          // road centre radius
    this._lights();
    this._sky();
    this._ground();
    this._track();
    this._populate();
  }

  _lights() {
    this.scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x202a55, 0.9));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.5);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const d = 70;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
    sun.shadow.camera.far = 160;
    this.scene.add(sun);
    // cool rim light
    const rim = new THREE.DirectionalLight(0x2E5BE0, 0.6);
    rim.position.set(-20, 15, -25);
    this.scene.add(rim);
  }

  _sky() {
    this.scene.background = new THREE.Color(0x0a0f3a);
    this.scene.fog = new THREE.Fog(0x0a0f3a, 80, 180);
    // simple starfield
    const g = new THREE.BufferGeometry();
    const n = 800, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 140 + Math.random() * 40, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(p) * Math.cos(t);
      arr[i * 3 + 1] = Math.abs(r * Math.cos(p)) * 0.8 + 10;
      arr[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    this.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true })));
  }

  _ground() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x9fb0e6, roughness: 1, map: tiled("tex-space.png", 10) });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(120, 64), mat);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _track() {
    // annular road
    const road = new THREE.Mesh(
      new THREE.RingGeometry(this.R - 6, this.R + 6, 80),
      new THREE.MeshStandardMaterial({ color: 0xc7cede, roughness: 0.9, map: tiled("tex-road.png", 8) })
    );
    road.rotation.x = -Math.PI / 2; road.position.y = 0.02; road.receiveShadow = true;
    this.scene.add(road);

    // start/finish line
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    line.rotation.x = -Math.PI / 2; line.position.set(0, 0.03, this.R);
    this.scene.add(line);

    // decorative toy blocks around the outer edge
    const colors = [0xff5d5d, 0xffd24a, 0x5dd0ff, 0x8aff8a, 0xc78aff];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = this.R + 10 + (i % 2) * 1.5;
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2 + Math.random() * 2, 2),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.7 })
      );
      c.position.set(Math.cos(a) * r, 1, Math.sin(a) * r); c.castShadow = true;
      this.scene.add(c);
    }
  }

  _populate() {
    // 20 stars spaced around the racing line
    const starMat = new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0xE0A516, emissiveIntensity: 0.7, metalness: 0.5, roughness: 0.3 });
    const starGeo = new THREE.ExtrudeGeometry(starShape(0.9), { depth: 0.2, bevelEnabled: false });
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + 0.15;
      const m = new THREE.Mesh(starGeo, starMat);
      m.position.set(Math.cos(a) * this.R, 1.4, Math.sin(a) * this.R);
      m.castShadow = true;
      this.scene.add(m);
      this.stars.push({ mesh: m, collected: false });
    }

    // 3 boost pads
    const padMat = new THREE.MeshStandardMaterial({ color: 0x0c1430, emissive: 0x27C4F2, emissiveIntensity: 1.2 });
    [0.5, 2.6, 4.7].forEach((a) => {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(7, 0.2, 5), padMat);
      const x = Math.cos(a) * this.R, z = Math.sin(a) * this.R;
      pad.position.set(x, 0.06, z); pad.rotation.y = -a;
      this.scene.add(pad);
      this.boostPads.push({ mesh: pad, pos: new THREE.Vector3(x, 0, z) });
    });

    // a launch ramp opposite the start line
    const ra = Math.PI, rx = Math.cos(ra) * this.R, rz = Math.sin(ra) * this.R;
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(7, 0.7, 4),
      new THREE.MeshStandardMaterial({ color: 0xF2B43A, emissive: 0x5a3f00, emissiveIntensity: 0.5, roughness: 0.6 }));
    ramp.position.set(rx, 0.32, rz); ramp.rotation.y = -ra; ramp.rotation.x = -0.2;
    ramp.castShadow = true; this.scene.add(ramp);
    this.ramps.push({ pos: new THREE.Vector3(rx, 0, rz) });
  }

  // spin stars; returns nothing
  animate(dt) {
    for (const s of this.stars) if (!s.collected) s.mesh.rotation.y += dt * 2;
  }
}
