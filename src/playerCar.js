import * as THREE from "three";

const _TL = new THREE.TextureLoader();
function carTex() {
  const t = _TL.load("assets/tex-carpanel.png");
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Builds the Blue Star Racer #07 from primitives and runs simple arcade physics.
export class PlayerCar {
  constructor() {
    this.group = new THREE.Group();
    this.heading = 0;          // radians, 0 = +Z
    this.speed = 0;            // units/sec
    this.boostTimer = 0;       // seconds of active boost
    this.boostCharge = 1;      // 0..1 meter
    this.wheels = [];
    this.magnet = 0;           // star-pickup bonus (set by upgrades)
    this.jump = 0;             // jump upgrade level
    this.vy = 0; this.airborne = false; this.gravityEnabled = false;

    // base tuning
    this.MAX = 46; this.ACCEL = 26; this.REVERSE = 14; this.BRAKE = 42;
    this.FRICTION = 12; this.TURN = 1.9; this.BOOST_MULT = 1.7; this.boostRecharge = 0.18;

    this._build();
  }

  // apply saved garage upgrade levels (each 0..5) to the car's stats
  applyUpgrades(up = {}) {
    const e = up.engine || 0, w = up.wheels || 0, b = up.boost || 0;
    this.MAX = 46 + e * 4;            // up to 66
    this.ACCEL = 26 + e * 2.5;        // up to 38.5
    this.TURN = 1.9 + w * 0.12;       // up to 2.5
    this.BOOST_MULT = 1.7 + b * 0.08; // up to 2.1
    this.boostRecharge = 0.18 + b * 0.03;
    this.magnet = up.magnet || 0;     // pickup radius bonus
    this.jump = up.jump || 0;         // ramp launch strength
  }

  // launch off a ramp (race mode); Jump upgrade adds height
  launch() {
    if (this.airborne) return;
    this.vy = 10 + this.jump * 1.4 + Math.abs(this.speed) * 0.12;
    this.airborne = true;
  }

  _build() {
    const blue = new THREE.MeshStandardMaterial({ color: 0x3a5bd0, metalness: 0.3, roughness: 0.45, map: carTex() });
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f4ff, metalness: 0.2, roughness: 0.5 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xF2B43A, metalness: 0.6, roughness: 0.3, emissive: 0x6a4d00, emissiveIntensity: 0.4 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0b1030, metalness: 0.6, roughness: 0.1 });

    // body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4), blue);
    body.position.y = 0.75; body.castShadow = true;
    this.group.add(body);

    // white side panel stripe
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.34, 2.4), white);
    panel.position.y = 0.72; panel.castShadow = true;
    this.group.add(panel);

    // cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 1.7), glass);
    cabin.position.set(0, 1.25, -0.1); cabin.castShadow = true;
    this.group.add(cabin);

    // gold star on the hood
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(0.42), { depth: 0.08, bevelEnabled: false }), gold);
    star.rotation.x = -Math.PI / 2; star.position.set(0, 1.12, 1.25);
    this.group.add(star);

    // little rear fins
    const finG = new THREE.BoxGeometry(0.18, 0.5, 0.7);
    [-0.95, 0.95].forEach((x) => {
      const fin = new THREE.Mesh(finG, gold);
      fin.position.set(x, 1.15, -1.9); this.group.add(fin);
    });

    // headlights
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 1 });
    [-0.7, 0.7].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 16), lightMat);
      hl.rotation.x = Math.PI / 2; hl.position.set(x, 0.78, 2.0); this.group.add(hl);
    });

    // glowing cyan wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c1430, emissive: 0x27C4F2, emissiveIntensity: 1.4, roughness: 0.4 });
    const wheelG = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 20);
    const wx = 1.15, wz = 1.35;
    [[-wx, wz], [wx, wz], [-wx, -wz], [wx, -wz]].forEach(([x, z]) => {
      const w = new THREE.Mesh(wheelG, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.55, z); w.castShadow = true;
      this.group.add(w); this.wheels.push(w);
    });
  }

  reset(x = 0, z = 0, heading = 0) {
    this.heading = heading; this.speed = 0; this.boostTimer = 0; this.boostCharge = 1;
    this.vy = 0; this.airborne = false;
    this.group.position.set(x, 0, z);
    this.group.rotation.set(0, heading, 0);
  }

  triggerBoost(seconds = 1.4) { this.boostTimer = Math.max(this.boostTimer, seconds); }

  update(dt, input) {
    // boost (manual costs charge; pads call triggerBoost directly)
    if (input.boost && this.boostCharge > 0.02) { this.boostTimer = Math.max(this.boostTimer, 0.12); this.boostCharge -= dt * 0.5; }
    else this.boostCharge = Math.min(1, this.boostCharge + dt * this.boostRecharge);
    const boosting = this.boostTimer > 0;
    if (boosting) this.boostTimer -= dt;

    const maxSpeed = this.MAX * (boosting ? this.BOOST_MULT : 1);

    // longitudinal
    if (input.accel) this.speed += this.ACCEL * dt * (boosting ? 1.8 : 1);
    else if (input.brake) this.speed -= (this.speed > 0 ? this.BRAKE : this.REVERSE) * dt;
    else this.speed -= Math.sign(this.speed) * this.FRICTION * dt;

    if (Math.abs(this.speed) < 0.05 && !input.accel) this.speed = 0;
    this.speed = Math.max(-this.REVERSE, Math.min(maxSpeed, this.speed));

    // steering scales with speed and reverses when going backwards
    const grip = Math.min(1, Math.abs(this.speed) / 8);
    this.heading += input.steer * this.TURN * dt * grip * Math.sign(this.speed || 1);

    // integrate position
    this.group.position.x += Math.sin(this.heading) * this.speed * dt;
    this.group.position.z += Math.cos(this.heading) * this.speed * dt;
    this.group.rotation.y = this.heading;

    // spin wheels
    const spin = this.speed * dt * 1.6;
    this.wheels.forEach((w) => (w.rotation.x += spin));

    // vertical (jump) physics — only in race mode
    if (this.gravityEnabled) {
      this.vy -= 34 * dt;
      let y = this.group.position.y + this.vy * dt;
      if (y <= 0) { y = 0; this.vy = 0; this.airborne = false; }
      else this.airborne = true;
      this.group.position.y = y;
      this.group.rotation.x = Math.max(-0.45, Math.min(0.45, this.vy * 0.025)); // nose pitch
    }

    return boosting;
  }
}

// 5-point star outline for the hood emblem
export function starShape(scale = 1) {
  const s = new THREE.Shape();
  const spikes = 5, outer = scale, inner = scale * 0.45;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  s.closePath();
  return s;
}
