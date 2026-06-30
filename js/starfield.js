/* Nebula Strike — parallax starfield + drifting nebula background. */
(function (global) {
  "use strict";

  class Starfield {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.layers = [];
      // Three parallax layers, far -> near.
      const config = [
        { count: 60, speed: 18, size: [0.6, 1.2], alpha: 0.5 },
        { count: 40, speed: 42, size: [1.0, 1.8], alpha: 0.7 },
        { count: 22, speed: 80, size: [1.6, 2.8], alpha: 1.0 },
      ];
      for (const c of config) {
        const stars = [];
        for (let i = 0; i < c.count; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Utils.rand(c.size[0], c.size[1]),
            tw: Utils.rand(0, Utils.TAU),
          });
        }
        this.layers.push({ stars, speed: c.speed, alpha: c.alpha });
      }
      // Nebula blobs for color depth.
      this.nebula = [];
      for (let i = 0; i < 4; i++) {
        this.nebula.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Utils.rand(120, 260),
          hue: Utils.rand(180, 320),
          drift: Utils.rand(6, 16),
          phase: Utils.rand(0, Utils.TAU),
        });
      }
      this.t = 0;
    }

    update(dt) {
      this.t += dt;
      for (const layer of this.layers) {
        for (const s of layer.stars) {
          s.y += layer.speed * dt;
          s.tw += dt * 3;
          if (s.y > this.h + 4) {
            s.y = -4;
            s.x = Math.random() * this.w;
          }
        }
      }
      for (const n of this.nebula) {
        n.y += n.drift * dt;
        if (n.y - n.r > this.h) {
          n.y = -n.r;
          n.x = Math.random() * this.w;
          n.hue = Utils.rand(180, 320);
        }
      }
    }

    draw(ctx) {
      // Nebula glow.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const n of this.nebula) {
        const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.5 + n.phase);
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        g.addColorStop(0, Utils.hsl(n.hue, 70, 55, 0.12 + 0.05 * pulse));
        g.addColorStop(1, Utils.hsl(n.hue, 70, 30, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Utils.TAU);
        ctx.fill();
      }
      ctx.restore();

      // Stars.
      for (const layer of this.layers) {
        for (const s of layer.stars) {
          const tw = 0.6 + 0.4 * Math.sin(s.tw);
          ctx.globalAlpha = layer.alpha * tw;
          ctx.fillStyle = "#cfe3ff";
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Utils.TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  global.Starfield = Starfield;
})(window);
