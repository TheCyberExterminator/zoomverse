import * as THREE from "three";

// A smooth third-person chase camera that trails the car and looks slightly ahead.
export class ChaseCamera {
  constructor(camera) {
    this.cam = camera;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.offset = new THREE.Vector3(0, 5.2, -10.5); // behind & above (local space)
  }

  update(target, heading, dt) {
    // desired position = car position + offset rotated by car heading
    const sin = Math.sin(heading), cos = Math.cos(heading);
    const ox = this.offset.z * sin; // behind along facing
    const oz = this.offset.z * cos;
    const desired = new THREE.Vector3(
      target.x - ox,
      target.y + this.offset.y,
      target.z - oz
    );
    // smooth follow (frame-rate independent damping)
    const k = 1 - Math.pow(0.0015, dt);
    this.pos.lerp(desired, k);
    this.cam.position.copy(this.pos);

    // look a little ahead of the car
    this.look.lerp(new THREE.Vector3(target.x + sin * 6, target.y + 1.2, target.z + cos * 6), k);
    this.cam.lookAt(this.look);
  }

  snap(target) {
    this.pos.set(target.x, target.y + this.offset.y, target.z - this.offset.z);
    this.cam.position.copy(this.pos);
    this.look.set(target.x, target.y, target.z);
  }
}
