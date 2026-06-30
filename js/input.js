/* Nebula Strike — unified keyboard / mouse / touch input */
(function (global) {
  "use strict";

  const Input = {
    keys: {},
    pointer: { active: false, x: 0, y: 0, dragging: false },
    // edge-triggered actions consumed by the game loop
    _pressed: {},
    bombRequested: false,
    pauseRequested: false,

    init(canvas) {
      this.canvas = canvas;

      global.addEventListener("keydown", (e) => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Spacebar"].includes(e.key)) e.preventDefault();
        const k = norm(e.key);
        if (!this.keys[k]) this._pressed[k] = true;
        this.keys[k] = true;
        if (k === "shift") this.bombRequested = true;
        if (k === "p" || k === "escape") this.pauseRequested = true;
      });
      global.addEventListener("keyup", (e) => { this.keys[norm(e.key)] = false; });

      const setPointer = (clientX, clientY) => {
        const r = canvas.getBoundingClientRect();
        this.pointer.x = (clientX - r.left) * (canvas.width / r.width);
        this.pointer.y = (clientY - r.top) * (canvas.height / r.height);
      };

      // Mouse
      canvas.addEventListener("mousemove", (e) => { setPointer(e.clientX, e.clientY); this.pointer.active = true; });
      canvas.addEventListener("mousedown", () => { this.pointer.dragging = true; });
      global.addEventListener("mouseup", () => { this.pointer.dragging = false; });

      // Touch
      let lastTap = 0;
      canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        setPointer(t.clientX, t.clientY);
        this.pointer.active = true; this.pointer.dragging = true;
        const now = Date.now();
        if (now - lastTap < 280) this.bombRequested = true; // double-tap = bomb
        lastTap = now;
      }, { passive: false });
      canvas.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        setPointer(t.clientX, t.clientY);
      }, { passive: false });
      const endTouch = (e) => { e.preventDefault(); this.pointer.dragging = false; };
      canvas.addEventListener("touchend", endTouch, { passive: false });
      canvas.addEventListener("touchcancel", endTouch, { passive: false });
    },

    // direction vector from keyboard (-1..1)
    axis() {
      let x = 0, y = 0;
      if (this.keys["arrowleft"] || this.keys["a"]) x -= 1;
      if (this.keys["arrowright"] || this.keys["d"]) x += 1;
      if (this.keys["arrowup"] || this.keys["w"]) y -= 1;
      if (this.keys["arrowdown"] || this.keys["s"]) y += 1;
      return { x, y };
    },

    focusFire() { return !!this.keys[" "]; },

    consumeBomb() { const b = this.bombRequested; this.bombRequested = false; return b; },
    consumePause() { const p = this.pauseRequested; this.pauseRequested = false; return p; },
    wasPressed(k) { const p = this._pressed[k]; this._pressed[k] = false; return p; },
    clearFrame() { this._pressed = {}; }
  };

  function norm(key) {
    if (key === "Spacebar") return " ";
    return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
  }

  global.Input = Input;
})(window);
