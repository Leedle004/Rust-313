/* Nebula Strike — lightweight pooled particle system + floating score text. */
(function (global) {
  "use strict";

  class Particle {
    constructor() {
      this.active = false;
    }
    spawn(x, y, vx, vy, life, color, size, gravity, fade) {
      this.x = x; this.y = y;
      this.vx = vx; this.vy = vy;
      this.life = life; this.maxLife = life;
      this.color = color;
      this.size = size;
      this.gravity = gravity || 0;
      this.fade = fade !== false;
      this.active = true;
    }
    update(dt) {
      this.life -= dt;
      if (this.life <= 0) { this.active = false; return; }
      this.vy += this.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.98;
      this.vy *= 0.98;
    }
    draw(ctx) {
      const a = this.fade ? Utils.clamp(this.life / this.maxLife, 0, 1) : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = this.color;
      const s = this.size * (this.fade ? 0.5 + 0.5 * a : 1);
      ctx.beginPath();
      ctx.arc(this.x, this.y, s, 0, Utils.TAU);
      ctx.fill();
    }
  }

  class FloatText {
    constructor(x, y, text, color) {
      this.x = x; this.y = y; this.text = text; this.color = color;
      this.life = 0.9; this.maxLife = 0.9; this.active = true;
    }
    update(dt) {
      this.life -= dt;
      this.y -= 36 * dt;
      if (this.life <= 0) this.active = false;
    }
    draw(ctx) {
      const a = Utils.clamp(this.life / this.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = this.color;
      ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.text, this.x, this.y);
      ctx.globalAlpha = 1;
    }
  }

  class Particles {
    constructor(max) {
      this.pool = [];
      this.max = max || 600;
      for (let i = 0; i < this.max; i++) this.pool.push(new Particle());
      this.texts = [];
    }

    _free() {
      for (let i = 0; i < this.pool.length; i++) if (!this.pool[i].active) return this.pool[i];
      // Reuse oldest if exhausted.
      return this.pool[0];
    }

    emit(x, y, count, opts) {
      opts = opts || {};
      for (let i = 0; i < count; i++) {
        const ang = opts.angle !== undefined ? opts.angle + Utils.rand(-opts.spread || 0, opts.spread || 0) : Utils.rand(0, Utils.TAU);
        const spd = Utils.rand(opts.speedMin || 40, opts.speedMax || 220);
        const p = this._free();
        p.spawn(
          x, y,
          Math.cos(ang) * spd,
          Math.sin(ang) * spd,
          Utils.rand(opts.lifeMin || 0.25, opts.lifeMax || 0.7),
          typeof opts.color === "function" ? opts.color() : (opts.color || "#fff"),
          Utils.rand(opts.sizeMin || 1.5, opts.sizeMax || 4),
          opts.gravity || 0,
          opts.fade
        );
      }
    }

    burst(x, y, color) {
      this.emit(x, y, 18, { color, speedMin: 60, speedMax: 300, lifeMin: 0.3, lifeMax: 0.8, sizeMin: 2, sizeMax: 5 });
    }

    explosion(x, y, color, big) {
      const n = big ? 60 : 26;
      this.emit(x, y, n, {
        color: () => Utils.chance(0.5) ? color : Utils.hsl(Utils.rand(20, 50), 90, 60),
        speedMin: 50, speedMax: big ? 460 : 280,
        lifeMin: 0.35, lifeMax: big ? 1.1 : 0.8,
        sizeMin: 2, sizeMax: big ? 7 : 5,
      });
    }

    text(x, y, str, color) {
      this.texts.push(new FloatText(x, y, str, color || "#fff"));
    }

    update(dt) {
      for (let i = 0; i < this.pool.length; i++) if (this.pool[i].active) this.pool[i].update(dt);
      for (let i = this.texts.length - 1; i >= 0; i--) {
        this.texts[i].update(dt);
        if (!this.texts[i].active) this.texts.splice(i, 1);
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < this.pool.length; i++) if (this.pool[i].active) this.pool[i].draw(ctx);
      ctx.restore();
      ctx.globalAlpha = 1;
      for (let i = 0; i < this.texts.length; i++) this.texts[i].draw(ctx);
    }

    clear() {
      for (let i = 0; i < this.pool.length; i++) this.pool[i].active = false;
      this.texts.length = 0;
    }
  }

  global.Particles = Particles;
})(window);
