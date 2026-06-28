import * as THREE from "three";

// A smooth third-person chase camera that trails BEHIND the car and looks ahead.
// The car's forward direction is (sin(heading), cos(heading)).
// offset.z is the signed distance along forward: NEGATIVE = behind the car.
export class ChaseCamera {
  constructor(camera) {
    this.cam = camera;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.offset = new THREE.Vector3(0, 6, -11); // y = height above, z = behind (negative)
  }

  _desired(target, heading, out) {
    const sin = Math.sin(heading), cos = Math.cos(heading);
    // camera = car + forward * offset.z  (offset.z negative → sits behind the car)
    out.set(
      target.x + this.offset.z * sin,
      target.y + this.offset.y,
      target.z + this.offset.z * cos
    );
    return out;
  }

  _lookPoint(target, heading, out) {
    const sin = Math.sin(heading), cos = Math.cos(heading);
    // aim well ahead of the car so the road ahead fills the view
    return out.set(target.x + sin * 9, target.y + 1.6, target.z + cos * 9);
  }

  update(target, heading, dt) {
    const desired = this._desired(target, heading, new THREE.Vector3());
    const k = 1 - Math.pow(0.0016, dt); // frame-rate independent smoothing
    this.pos.lerp(desired, k);
    this.cam.position.copy(this.pos);

    const lookTarget = this._lookPoint(target, heading, new THREE.Vector3());
    this.look.lerp(lookTarget, k);
    this.cam.lookAt(this.look);
  }

  // snap instantly into place (used at race start / reset)
  snap(target, heading = Math.PI / 2) {
    this._desired(target, heading, this.pos);
    this.cam.position.copy(this.pos);
    this._lookPoint(target, heading, this.look);
    this.cam.lookAt(this.look);
  }
}
