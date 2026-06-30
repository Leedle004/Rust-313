/* Nebula Strike — small math / helper utilities (no dependencies). */
(function (global) {
  "use strict";

  const Utils = {
    TAU: Math.PI * 2,

    clamp(v, lo, hi) {
      return v < lo ? lo : v > hi ? hi : v;
    },

    lerp(a, b, t) {
      return a + (b - a) * t;
    },

    rand(min, max) {
      return min + Math.random() * (max - min);
    },

    randInt(min, max) {
      return Math.floor(Utils.rand(min, max + 1));
    },

    pick(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    },

    chance(p) {
      return Math.random() < p;
    },

    dist2(ax, ay, bx, by) {
      const dx = ax - bx;
      const dy = ay - by;
      return dx * dx + dy * dy;
    },

    // Circle vs circle overlap.
    circlesHit(ax, ay, ar, bx, by, br) {
      const r = ar + br;
      return Utils.dist2(ax, ay, bx, by) <= r * r;
    },

    angleTo(ax, ay, bx, by) {
      return Math.atan2(by - ay, bx - ax);
    },

    // Convert HSL to a CSS string (used for vibrant procedural colors).
    hsl(h, s, l, a) {
      if (a === undefined) return `hsl(${h},${s}%,${l}%)`;
      return `hsla(${h},${s}%,${l}%,${a})`;
    },

    formatScore(n) {
      return Math.floor(n).toLocaleString("en-US");
    },

    // localStorage-backed best score, fails gracefully when unavailable.
    loadBest() {
      try {
        return parseInt(localStorage.getItem("nebula-strike-best") || "0", 10) || 0;
      } catch (e) {
        return 0;
      }
    },

    saveBest(v) {
      try {
        localStorage.setItem("nebula-strike-best", String(Math.floor(v)));
      } catch (e) {
        /* ignore */
      }
    },

    loadMuted() {
      try {
        return localStorage.getItem("nebula-strike-muted") === "1";
      } catch (e) {
        return false;
      }
    },

    saveMuted(m) {
      try {
        localStorage.setItem("nebula-strike-muted", m ? "1" : "0");
      } catch (e) {
        /* ignore */
      }
    },
  };

  global.Utils = Utils;
})(window);
