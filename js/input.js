// Unified input: keyboard, mouse and touch.
// Exposes a simple state object the game reads each frame.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.firing = false;          // space / mouse / touch held
    this.pointer = { active: false, x: 0, y: 0 }; // for mouse/touch steering
    this.usePointer = false;      // true while mouse/touch is steering
    this._bind();
  }

  _bind() {
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      this.keys.add(e.key.toLowerCase());
      if (e.key === " ") this.firing = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
      if (e.key === " ") this.firing = false;
    });

    // Mouse
    this.canvas.addEventListener("mousemove", (e) => {
      const p = this._toCanvas(e.clientX, e.clientY);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.usePointer = true;
    });
    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.firing = true;
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.firing = false;
    });

    // Touch
    const touchHandler = (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const t = e.touches[0];
        const p = this._toCanvas(t.clientX, t.clientY);
        this.pointer.x = p.x;
        this.pointer.y = p.y;
        this.usePointer = true;
        this.firing = true; // hold-to-move also fires
      }
    };
    this.canvas.addEventListener("touchstart", touchHandler, { passive: false });
    this.canvas.addEventListener("touchmove", touchHandler, { passive: false });
    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      if (e.touches.length === 0) this.firing = false;
    }, { passive: false });
  }

  _toCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.canvas.width / rect.width),
      y: (clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  // Directional axis from keyboard (-1..1).
  axis() {
    let x = 0;
    let y = 0;
    if (this.keys.has("arrowleft") || this.keys.has("a")) x -= 1;
    if (this.keys.has("arrowright") || this.keys.has("d")) x += 1;
    if (this.keys.has("arrowup") || this.keys.has("w")) y -= 1;
    if (this.keys.has("arrowdown") || this.keys.has("s")) y += 1;
    if (x || y) this.usePointer = false; // keyboard overrides pointer steering
    return { x, y };
  }

  pressed(key) {
    return this.keys.has(key.toLowerCase());
  }
}
