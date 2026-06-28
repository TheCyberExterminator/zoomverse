// Keyboard + touch input. Exposes a simple state object the car reads each frame.
export class Input {
  constructor() {
    this.state = { accel: 0, steer: 0, brake: false, boost: false, reset: false };
    this.keys = {};
    this.touch = { accel: false, brake: false, left: false, right: false, boost: false };

    addEventListener("keydown", (e) => { this.keys[e.code] = true; });
    addEventListener("keyup", (e) => { this.keys[e.code] = false; });

    // wire on-screen buttons
    document.querySelectorAll("#touch button").forEach((btn) => {
      const k = btn.dataset.k;
      const on = (v) => (e) => { e.preventDefault(); this.touch[k] = v; };
      btn.addEventListener("touchstart", on(true), { passive: false });
      btn.addEventListener("touchend", on(false), { passive: false });
      btn.addEventListener("mousedown", on(true));
      btn.addEventListener("mouseup", on(false));
      btn.addEventListener("mouseleave", on(false));
    });
  }

  // onPause: callback fired once when Esc is pressed
  poll(onPause) {
    const k = this.keys, t = this.touch, s = this.state;
    const up = k.KeyW || k.ArrowUp || t.accel;
    const down = k.KeyS || k.ArrowDown || t.brake;
    const left = k.KeyA || k.ArrowLeft || t.left;
    const right = k.KeyD || k.ArrowRight || t.right;

    s.accel = up ? 1 : 0;
    s.brake = !!down;
    s.steer = (left ? 1 : 0) - (right ? 1 : 0); // +1 left, -1 right
    s.boost = !!(k.Space || t.boost);
    s.reset = !!k.KeyR;

    if (k.Escape && !this._escWas) onPause && onPause();
    this._escWas = !!k.Escape;
  }
}
