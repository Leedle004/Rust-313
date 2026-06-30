/* Nebula Strike — small math/util helpers (no dependencies) */
(function (global) {
  "use strict";

  const U = {
    rand(min, max) { return Math.random() * (max - min) + min; },
    randInt(min, max) { return Math.floor(U.rand(min, max + 1)); },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; },
    // circle vs circle collision
    hit(a, b) {
      const r = a.r + b.r;
      return U.dist2(a.x, a.y, b.x, b.y) <= r * r;
    },
    angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },
    chance(p) { return Math.random() < p; },

    storage: {
      get(key, fallback) {
        try {
          const v = localStorage.getItem(key);
          return v === null ? fallback : JSON.parse(v);
        } catch (e) { return fallback; }
      },
      set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
      }
    }
  };

  global.U = U;
})(window);
