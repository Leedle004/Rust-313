/* Nebula Strike — game entities. All drawing is vector (canvas paths),
   so there are zero image assets and the build stays small. */
(function (global) {
  "use strict";

  /* ----------------------------------------------------------- Particle */
  class Particle {
    constructor(x, y, color, opts = {}) {
      this.x = x; this.y = y;
      const a = U.rand(0, Math.PI * 2);
      const sp = opts.speed != null ? opts.speed : U.rand(40, 260);
      this.vx = Math.cos(a) * sp;
      this.vy = Math.sin(a) * sp;
      this.life = this.maxLife = opts.life || U.rand(0.3, 0.8);
      this.size = opts.size || U.rand(1.5, 4);
      this.color = color;
      this.dead = false;
      this.gravity = opts.gravity || 0;
    }
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += this.gravity * dt;
      this.vx *= 0.96; this.vy *= 0.96;
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
    }
    draw(c) {
      const a = U.clamp(this.life / this.maxLife, 0, 1);
      c.globalAlpha = a;
      c.fillStyle = this.color;
      c.beginPath();
      c.arc(this.x, this.y, this.size * a, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
  }

  /* -------------------------------------------------------------- Bullet */
  class Bullet {
    constructor(x, y, vx, vy, opts = {}) {
      this.x = x; this.y = y; this.vx = vx; this.vy = vy;
      this.r = opts.r || 4;
      this.dmg = opts.dmg || 1;
      this.color = opts.color || "#4cf0ff";
      this.enemy = !!opts.enemy;
      this.dead = false;
      this.trail = [];
    }
    update(dt, g) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 5) this.trail.shift();
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < -20 || this.x > g.w + 20 || this.y < -20 || this.y > g.h + 20) this.dead = true;
    }
    draw(c) {
      c.save();
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        c.globalAlpha = (i / this.trail.length) * 0.4;
        c.fillStyle = this.color;
        c.beginPath(); c.arc(t.x, t.y, this.r * 0.7, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      c.shadowBlur = 12; c.shadowColor = this.color;
      c.fillStyle = "#fff";
      c.beginPath(); c.arc(this.x, this.y, this.r, 0, Math.PI * 2); c.fill();
      c.fillStyle = this.color;
      c.beginPath(); c.arc(this.x, this.y, this.r * 0.6, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }

  /* -------------------------------------------------------------- Player */
  class Player {
    constructor(g) {
      this.g = g;
      this.x = g.w / 2;
      this.y = g.h - 90;
      this.r = 16;
      this.speed = 420;
      this.cooldown = 0;
      this.baseFireRate = 0.22;
      this.dead = false;
      this.invuln = 1.2;
      this.thrust = 0;
      // power state
      this.spread = 0;   // seconds remaining
      this.rapid = 0;
      this.shield = 0;
    }

    powerLabels() {
      const out = [];
      if (this.spread > 0) out.push(["SPREAD", this.spread]);
      if (this.rapid > 0) out.push(["RAPID", this.rapid]);
      if (this.shield > 0) out.push(["SHIELD", this.shield]);
      return out;
    }

    applyPower(type) {
      if (type === "spread") this.spread = 10;
      else if (type === "rapid") this.rapid = 10;
      else if (type === "shield") this.shield = 8;
    }

    update(dt, g) {
      if (this.dead) return;
      // movement: keyboard axis OR follow pointer when dragging
      const ax = Input.axis();
      let moving = false;
      if (Input.pointer.active && Input.pointer.dragging) {
        const dx = Input.pointer.x - this.x;
        const dy = Input.pointer.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d > 2) {
          const step = Math.min(d, this.speed * dt);
          this.x += (dx / d) * step;
          this.y += (dy / d) * step;
          moving = true;
        }
      }
      if (ax.x || ax.y) {
        const len = Math.hypot(ax.x, ax.y) || 1;
        this.x += (ax.x / len) * this.speed * dt;
        this.y += (ax.y / len) * this.speed * dt;
        moving = true;
      }
      this.thrust = U.lerp(this.thrust, moving ? 1 : 0.35, 0.2);

      this.x = U.clamp(this.x, this.r, g.w - this.r);
      this.y = U.clamp(this.y, this.r, g.h - this.r);

      if (this.invuln > 0) this.invuln -= dt;
      if (this.spread > 0) this.spread -= dt;
      if (this.rapid > 0) this.rapid -= dt;
      if (this.shield > 0) this.shield -= dt;

      this.cooldown -= dt;
      if (this.cooldown <= 0) {
        this.fire(g);
        let rate = this.baseFireRate;
        if (this.rapid > 0) rate *= 0.5;
        if (Input.focusFire()) rate *= 0.8;
        this.cooldown = rate;
      }
    }

    fire(g) {
      const speed = 720;
      const mk = (vx, vy) => g.bullets.push(new Bullet(this.x, this.y - this.r, vx, vy, { color: "#4cf0ff", r: 4, dmg: 1 }));
      if (this.spread > 0) {
        mk(0, -speed);
        mk(-180, -speed);
        mk(180, -speed);
        mk(-340, -speed * 0.92);
        mk(340, -speed * 0.92);
      } else {
        mk(-60, -speed);
        mk(60, -speed);
      }
      Audio.shoot();
    }

    hurt(g) {
      if (this.invuln > 0 || this.dead) return false;
      if (this.shield > 0) {
        this.shield = 0;
        this.invuln = 1.0;
        g.shake(8);
        g.burst(this.x, this.y, "#4cf0ff", 24);
        Audio.hit();
        return false; // shield absorbed it
      }
      this.dead = true;
      g.bigExplosion(this.x, this.y, "#ff4ce0");
      return true;
    }

    draw(c) {
      c.save();
      c.translate(this.x, this.y);
      const blink = this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0;
      if (blink) c.globalAlpha = 0.35;

      // engine flame
      const f = 8 + this.thrust * 14 + Math.random() * 4;
      c.fillStyle = "#ffcf4c";
      c.beginPath();
      c.moveTo(-6, 12); c.lineTo(0, 12 + f); c.lineTo(6, 12);
      c.closePath(); c.fill();
      c.fillStyle = "#ff6a3c";
      c.beginPath();
      c.moveTo(-3, 12); c.lineTo(0, 12 + f * 0.6); c.lineTo(3, 12);
      c.closePath(); c.fill();

      // hull
      c.shadowBlur = 14; c.shadowColor = "#4cf0ff";
      c.fillStyle = "#dff7ff";
      c.beginPath();
      c.moveTo(0, -18);
      c.lineTo(13, 12);
      c.lineTo(5, 8);
      c.lineTo(-5, 8);
      c.lineTo(-13, 12);
      c.closePath(); c.fill();
      c.shadowBlur = 0;
      // cockpit
      c.fillStyle = "#4cf0ff";
      c.beginPath(); c.arc(0, -2, 4, 0, Math.PI * 2); c.fill();

      // shield ring
      if (this.shield > 0) {
        c.globalAlpha = 0.5 + Math.sin(Date.now() / 120) * 0.2;
        c.strokeStyle = "#4cf0ff"; c.lineWidth = 2;
        c.beginPath(); c.arc(0, 0, this.r + 8, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
    }
  }

  /* --------------------------------------------------------------- Enemy */
  const ENEMY_TYPES = {
    grunt:   { hp: 1, r: 14, score: 100, color: "#ff7a7a", speed: 90 },
    weaver:  { hp: 2, r: 15, score: 175, color: "#ffcf4c", speed: 120 },
    shooter: { hp: 3, r: 17, score: 250, color: "#c87bff", speed: 70 },
    tank:    { hp: 6, r: 22, score: 400, color: "#7bff a0", speed: 55 },
    asteroid:{ hp: 4, r: 24, score: 120, color: "#9a8c78", speed: 80 }
  };
  // fix the bad hex above at runtime
  ENEMY_TYPES.tank.color = "#7bffa0";

  class Enemy {
    constructor(g, type, x, y) {
      const def = ENEMY_TYPES[type];
      this.g = g; this.type = type;
      this.x = x; this.y = y;
      this.r = def.r;
      this.hp = this.maxHp = def.hp;
      this.score = def.score;
      this.color = def.color;
      this.speed = def.speed * (1 + (g.level - 1) * 0.05);
      this.dead = false;
      this.t = U.rand(0, Math.PI * 2);
      this.shootTimer = U.rand(1.0, 2.5);
      this.rot = U.rand(-1, 1);
      this.ang = 0;
    }
    update(dt, g) {
      this.t += dt;
      this.y += this.speed * dt;
      this.ang += this.rot * dt;
      if (this.type === "weaver") this.x += Math.sin(this.t * 3) * 130 * dt;
      if (this.type === "shooter") {
        this.x += Math.sin(this.t * 1.2) * 60 * dt;
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.y < g.h * 0.7) {
          this.shootTimer = U.rand(1.4, 2.6);
          const a = U.angleTo(this.x, this.y, g.player.x, g.player.y);
          const sp = 260;
          g.bullets.push(new Bullet(this.x, this.y + this.r, Math.cos(a) * sp, Math.sin(a) * sp,
            { enemy: true, color: "#ff4ce0", r: 5 }));
          Audio.enemyShoot();
        }
      }
      this.x = U.clamp(this.x, this.r, g.w - this.r);
      if (this.y > g.h + this.r + 10) this.dead = true; // escaped
    }
    hurt(dmg, g) {
      this.hp -= dmg;
      g.burst(this.x, this.y, this.color, 5, 140);
      if (this.hp <= 0) {
        this.dead = true;
        g.onEnemyKilled(this);
      } else {
        Audio.hit();
      }
    }
    draw(c) {
      c.save();
      c.translate(this.x, this.y);
      c.rotate(this.ang);
      c.shadowBlur = 12; c.shadowColor = this.color;
      c.fillStyle = this.color;
      c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1.5;

      if (this.type === "asteroid") {
        c.beginPath();
        const n = 9;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const rr = this.r * (0.78 + ((i * 7) % 5) / 12);
          const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
          i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
        }
        c.closePath(); c.fill();
      } else if (this.type === "tank") {
        c.fillRect(-this.r, -this.r * 0.7, this.r * 2, this.r * 1.4);
        c.fillStyle = "#0a0420";
        c.fillRect(-this.r * 0.5, -this.r * 0.3, this.r, this.r * 0.6);
      } else {
        // pointed-down chevron ship
        c.beginPath();
        c.moveTo(0, this.r);
        c.lineTo(this.r, -this.r * 0.7);
        c.lineTo(0, -this.r * 0.3);
        c.lineTo(-this.r, -this.r * 0.7);
        c.closePath(); c.fill();
        c.fillStyle = "#0a0420";
        c.beginPath(); c.arc(0, -this.r * 0.1, this.r * 0.28, 0, Math.PI * 2); c.fill();
      }
      c.restore();

      // hp bar for tougher foes
      if (this.maxHp > 2) {
        const w = this.r * 2;
        c.fillStyle = "rgba(0,0,0,.5)";
        c.fillRect(this.x - w / 2, this.y - this.r - 9, w, 4);
        c.fillStyle = this.color;
        c.fillRect(this.x - w / 2, this.y - this.r - 9, w * (this.hp / this.maxHp), 4);
      }
    }
  }

  /* ---------------------------------------------------------------- Boss */
  class Boss {
    constructor(g) {
      this.g = g;
      this.x = g.w / 2; this.y = -120;
      this.r = 60;
      this.hp = this.maxHp = 60 + g.level * 22;
      this.score = 5000;
      this.color = "#ff4ce0";
      this.dead = false;
      this.t = 0;
      this.phase = "enter";
      this.dir = 1;
      this.shootTimer = 1.5;
      this.spinTimer = 4;
      this.isBoss = true;
    }
    update(dt, g) {
      this.t += dt;
      if (this.phase === "enter") {
        this.y += 60 * dt;
        if (this.y >= 120) this.phase = "fight";
        return;
      }
      this.x += this.dir * 90 * dt;
      if (this.x < this.r + 20) { this.x = this.r + 20; this.dir = 1; }
      if (this.x > g.w - this.r - 20) { this.x = g.w - this.r - 20; this.dir = -1; }

      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = U.clamp(1.4 - g.level * 0.05, 0.5, 1.4);
        const a = U.angleTo(this.x, this.y, g.player.x, g.player.y);
        const sp = 280;
        for (let k = -1; k <= 1; k++) {
          const aa = a + k * 0.22;
          g.bullets.push(new Bullet(this.x, this.y + 30, Math.cos(aa) * sp, Math.sin(aa) * sp,
            { enemy: true, color: "#ff4ce0", r: 6 }));
        }
        Audio.enemyShoot();
      }
      this.spinTimer -= dt;
      if (this.spinTimer <= 0) {
        this.spinTimer = 5;
        const n = 16;
        for (let i = 0; i < n; i++) {
          const aa = (i / n) * Math.PI * 2;
          const sp = 200;
          g.bullets.push(new Bullet(this.x, this.y, Math.cos(aa) * sp, Math.sin(aa) * sp,
            { enemy: true, color: "#ffcf4c", r: 5 }));
        }
        Audio.bomb();
      }
    }
    hurt(dmg, g) {
      if (this.phase === "enter") return;
      this.hp -= dmg;
      g.burst(this.x + U.rand(-this.r, this.r), this.y + U.rand(-this.r, this.r), this.color, 4, 160);
      if (this.hp <= 0) {
        this.dead = true;
        g.onBossKilled(this);
      }
    }
    draw(c) {
      c.save();
      c.translate(this.x, this.y);
      const flash = this.hp / this.maxHp < 0.3 && Math.floor(this.t * 8) % 2 === 0;
      c.shadowBlur = 24; c.shadowColor = this.color;
      c.fillStyle = flash ? "#fff" : this.color;
      // body
      c.beginPath();
      c.moveTo(0, this.r);
      c.lineTo(this.r, 0);
      c.lineTo(this.r * 0.6, -this.r);
      c.lineTo(-this.r * 0.6, -this.r);
      c.lineTo(-this.r, 0);
      c.closePath(); c.fill();
      // core
      c.shadowBlur = 30; c.shadowColor = "#fff";
      c.fillStyle = "#fff";
      const pulse = 12 + Math.sin(this.t * 6) * 4;
      c.beginPath(); c.arc(0, -10, pulse, 0, Math.PI * 2); c.fill();
      c.restore();

      // hp bar across top
      const w = this.g.w * 0.7, x = this.g.w * 0.15;
      c.fillStyle = "rgba(0,0,0,.5)";
      c.fillRect(x, 14, w, 10);
      c.fillStyle = this.color;
      c.fillRect(x, 14, w * U.clamp(this.hp / this.maxHp, 0, 1), 10);
      c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 1;
      c.strokeRect(x, 14, w, 10);
    }
  }

  /* ------------------------------------------------------------- PowerUp */
  const POWER_KINDS = ["spread", "rapid", "shield", "life", "bomb"];
  const POWER_INFO = {
    spread: { color: "#4cf0ff", glyph: "≪" },
    rapid:  { color: "#ffcf4c", glyph: "»" },
    shield: { color: "#6cff8a", glyph: "◌" },
    life:   { color: "#ff4ce0", glyph: "♥" },
    bomb:   { color: "#ff6a3c", glyph: "✸" }
  };
  class PowerUp {
    constructor(x, y, kind) {
      this.x = x; this.y = y; this.r = 13;
      this.kind = kind;
      this.vy = 70; this.t = U.rand(0, 6);
      this.dead = false;
      this.info = POWER_INFO[kind];
    }
    update(dt, g) {
      this.t += dt;
      this.y += this.vy * dt;
      this.x += Math.sin(this.t * 2) * 30 * dt;
      if (this.y > g.h + 20) this.dead = true;
    }
    draw(c) {
      c.save();
      c.translate(this.x, this.y);
      const s = 1 + Math.sin(this.t * 5) * 0.08;
      c.scale(s, s);
      c.shadowBlur = 16; c.shadowColor = this.info.color;
      c.strokeStyle = this.info.color; c.lineWidth = 2;
      c.fillStyle = "rgba(5,1,15,.7)";
      c.beginPath();
      const sides = 6;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * this.r, py = Math.sin(a) * this.r;
        i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
      }
      c.closePath(); c.fill(); c.stroke();
      c.shadowBlur = 0;
      c.fillStyle = this.info.color;
      c.font = "bold 15px system-ui, sans-serif";
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(this.info.glyph, 0, 1);
      c.restore();
    }
  }

  /* ------------------------------------------------------------ Starfield */
  class Star {
    constructor(g) { this.reset(g, true); }
    reset(g, anywhere) {
      this.x = U.rand(0, g.w);
      this.y = anywhere ? U.rand(0, g.h) : -2;
      this.z = U.rand(0.3, 1);
      this.size = this.z * 1.8;
      this.speed = 30 + this.z * 90;
    }
    update(dt, g) {
      this.y += this.speed * dt;
      if (this.y > g.h + 2) this.reset(g, false);
    }
    draw(c) {
      c.globalAlpha = this.z;
      c.fillStyle = "#bcd6ff";
      c.fillRect(this.x, this.y, this.size, this.size);
      c.globalAlpha = 1;
    }
  }

  global.Entities = { Particle, Bullet, Player, Enemy, Boss, PowerUp, Star, ENEMY_TYPES, POWER_KINDS };
})(window);
