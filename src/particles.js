import * as THREE from "three";

// A small recycled pool of glowing particles for boost trails, star sparkles, ramp dust.
export class Particles {
  constructor(scene, count = 140) {
    this.pool = [];
    this.i = 0;
    const geo = new THREE.SphereGeometry(0.16, 6, 6);
    for (let k = 0; k < count; k++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
      m.visible = false; scene.add(m);
      this.pool.push({ mesh: m, life: 0, maxLife: 1, vel: new THREE.Vector3(), grav: 0 });
    }
  }

  spawn(pos, color, opts = {}) {
    const p = this.pool[this.i];
    this.i = (this.i + 1) % this.pool.length;
    p.mesh.visible = true;
    p.mesh.position.set(pos.x, pos.y, pos.z);
    p.mesh.scale.setScalar(opts.size || 1);
    p.mesh.material.color.set(color);
    p.mesh.material.opacity = 1;
    p.maxLife = opts.life || 0.6; p.life = p.maxLife;
    p.grav = opts.grav ?? 0;
    const s = opts.spread ?? 2;
    p.vel.set((Math.random() - 0.5) * s, (Math.random() * 0.6 + 0.2) * (opts.up ?? s),
              (Math.random() - 0.5) * s);
  }

  burst(pos, color, n, opts = {}) { for (let k = 0; k < n; k++) this.spawn(pos, color, opts); }

  update(dt) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.vel.y -= p.grav * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const t = p.life / p.maxLife;
      p.mesh.material.opacity = t;
      p.mesh.scale.setScalar((p.mesh.scale.x || 1) * 0.985 + 0.0001);
    }
  }
}
