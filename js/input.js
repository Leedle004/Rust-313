/* Nebula Strike — unified keyboard + pointer/touch input. */
(function (global) {
  "use strict";

  class Input {
    constructor() {
      this.keys = Object.create(null);
      this.pressed = Object.create(null); // edge-triggered for this frame
      // Pointer state (mouse drag / touch). pointerActive => follow pointer.
      this.pointerActive = false;
      this.px = 0;
      this.py = 0;
      this.canvas = null;
      this.scaleX = 1;
      this.scaleY = 1;
    }

    attach(canvas) {
      this.canvas = canvas;

      global.addEventListener("keydown", (e) => {
        const k = this._norm(e.key);
        if (k === " " || k.startsWith("arrow")) e.preventDefault();
        if (!this.keys[k]) this.pressed[k] = true;
        this.keys[k] = true;
      });

      global.addEventListener("keyup", (e) => {
        this.keys[this._norm(e.key)] = false;
      });

      global.addEventListener("blur", () => {
        this.keys = Object.create(null);
        this.pointerActive = false;
      });

      const setPointer = (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        this.scaleX = canvas.width / rect.width;
        this.scaleY = canvas.height / rect.height;
        this.px = (clientX - rect.left) * this.scaleX;
        this.py = (clientY - rect.top) * this.scaleY;
      };

      canvas.addEventListener("mousedown", (e) => { this.pointerActive = true; setPointer(e.clientX, e.clientY); });
      global.addEventListener("mousemove", (e) => { if (this.pointerActive) setPointer(e.clientX, e.clientY); });
      global.addEventListener("mouseup", () => { this.pointerActive = false; });

      canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.pointerActive = true;
        const t = e.touches[0];
        setPointer(t.clientX, t.clientY);
      }, { passive: false });
      canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const t = e.touches[0];
        setPointer(t.clientX, t.clientY);
      }, { passive: false });
      canvas.addEventListener("touchend", (e) => {
        e.preventDefault();
        if (e.touches.length === 0) this.pointerActive = false;
      }, { passive: false });
    }

    _norm(key) {
      return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
    }

    // Was a key newly pressed this frame? (consumes the edge)
    consume(key) {
      if (this.pressed[key]) {
        this.pressed[key] = false;
        return true;
      }
      return false;
    }

    // Movement axis from keyboard (-1..1 each).
    axis() {
      let x = 0;
      let y = 0;
      if (this.keys["arrowleft"] || this.keys["a"]) x -= 1;
      if (this.keys["arrowright"] || this.keys["d"]) x += 1;
      if (this.keys["arrowup"] || this.keys["w"]) y -= 1;
      if (this.keys["arrowdown"] || this.keys["s"]) y += 1;
      return { x, y };
    }

    get fireHeld() {
      return !!this.keys[" "];
    }

    get dashPressed() {
      return this.consume("shift");
    }

    // Clear per-frame edge state. Call at end of each frame.
    endFrame() {
      this.pressed = Object.create(null);
    }
  }

  global.input = new Input();
})(window);
