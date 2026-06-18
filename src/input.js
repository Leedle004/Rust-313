// Unified input: keyboard + touch joystick / fire button.
// Exposes a normalized state the game loop can poll each frame.

export class Input {
  constructor() {
    this.keys = new Set();
    // Normalized movement axis (-1..1) and fire flag, combining all sources.
    this.axisX = 0;
    this.axisY = 0;
    this.firing = false;
    this._touchAxis = { x: 0, y: 0 };
    this._touchFiring = false;
    this._onPause = null;

    window.addEventListener("keydown", (e) => this._onKey(e, true));
    window.addEventListener("keyup", (e) => this._onKey(e, false));
    // Avoid stuck keys when the tab loses focus.
    window.addEventListener("blur", () => this.keys.clear());
  }

  onPause(cb) {
    this._onPause = cb;
  }

  _onKey(e, down) {
    const k = e.key.toLowerCase();
    const tracked = [
      "arrowup", "arrowdown", "arrowleft", "arrowright",
      "w", "a", "s", "d", " ",
    ];
    if (tracked.includes(k)) {
      e.preventDefault();
      if (down) this.keys.add(k);
      else this.keys.delete(k);
    }
    if (down && (k === "p" || k === "escape") && this._onPause) {
      this._onPause();
    }
  }

  // Bind on-screen joystick + fire button for touch devices.
  bindTouch(joystick, knob, fireBtn) {
    let activeId = null;
    const radius = 44;

    const setKnob = (dx, dy) => {
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    const move = (clientX, clientY) => {
      const rect = joystick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const len = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(len, radius);
      dx = (dx / len) * clamped;
      dy = (dy / len) * clamped;
      setKnob(dx, dy);
      this._touchAxis.x = dx / radius;
      this._touchAxis.y = dy / radius;
    };

    const reset = () => {
      activeId = null;
      this._touchAxis.x = 0;
      this._touchAxis.y = 0;
      setKnob(0, 0);
    };

    joystick.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      activeId = t.identifier;
      move(t.clientX, t.clientY);
    }, { passive: false });

    joystick.addEventListener("touchmove", (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) move(t.clientX, t.clientY);
      }
    }, { passive: false });

    const endTouch = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) reset();
      }
    };
    joystick.addEventListener("touchend", endTouch);
    joystick.addEventListener("touchcancel", endTouch);

    const fireOn = (e) => { e.preventDefault(); this._touchFiring = true; };
    const fireOff = (e) => { e.preventDefault(); this._touchFiring = false; };
    fireBtn.addEventListener("touchstart", fireOn, { passive: false });
    fireBtn.addEventListener("touchend", fireOff, { passive: false });
    fireBtn.addEventListener("touchcancel", fireOff, { passive: false });
  }

  // Recompute the merged input state; call once per frame.
  update() {
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has("arrowleft") || k.has("a")) x -= 1;
    if (k.has("arrowright") || k.has("d")) x += 1;
    if (k.has("arrowup") || k.has("w")) y -= 1;
    if (k.has("arrowdown") || k.has("s")) y += 1;

    // Merge keyboard with touch joystick (touch wins when active).
    if (this._touchAxis.x !== 0 || this._touchAxis.y !== 0) {
      x = this._touchAxis.x;
      y = this._touchAxis.y;
    }
    // Normalize diagonal keyboard movement.
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }

    this.axisX = x;
    this.axisY = y;
    this.firing = k.has(" ") || this._touchFiring;
  }
}
