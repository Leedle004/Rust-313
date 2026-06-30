/* Nebula Strike — game entities: player, bullets, enemies, power-ups, boss. */
(function (global) {
  "use strict";

  const TAU = Utils.TAU;

  /* ============================ BULLET ============================ */
  class Bullet {
    constructor(x, y, vx, vy, opts) {
      opts = opts || {};
      this.x = x; this.y = y;
      this.vx = vx; this.vy = vy;
      this.r = opts.r || 4;
      this.dmg = opts.dmg || 1;
      this.friendly = !!opts.friendly;
      this.color = opts.color || (this.friendly ? "#7af7ff" : "#ff6d8e");
      this.life = opts.life || 4;
      this.dead = false;
      this.trail = opts.trail !== false;
    }
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
    }
    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 3);
      grad.addColorStop(0, this.color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 0.8, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ============================ PLAYER ============================ */
  class Player {
    constructor(game) {
      this.game = game;
      this.r = 14;
      this.reset();
    }
    reset() {
      this.x = this.game.w / 2;
      this.y = this.game.h - 90;
      this.vx = 0; this.vy = 0;
      this.speed = 360;
      this.lives = 3;
      this.maxHp = 100;
      this.hp = 100;
      this.fireCd = 0;
      this.baseFireRate = 0.16;
      this.invuln = 1.0;
      this.shield = 0;          // seconds of shield power-up remaining
      this.spread = 0;          // seconds of spread
      this.rapid = 0;           // seconds of rapid fire
      this.dashCd = 0;
      this.dashTime = 0;
      this.thruster = 0;
      this.dead = false;
    }

    get fireRate() {
      return this.rapid > 0 ? this.baseFireRate * 0.5 : this.baseFireRate;
    }

    addPower(type) {
      switch (type) {
        case "spread": this.spread = 12; break;
        case "rapid": this.rapid = 12; break;
        case "shield": this.shield = 8; break;
        case "heal": this.hp = Utils.clamp(this.hp + 35, 0, this.maxHp); break;
      }
    }

    dash() {
      if (this.dashCd > 0) return;
      this.dashCd = 1.4;
      this.dashTime = 0.22;
      this.invuln = Math.max(this.invuln, 0.35);
      audio.dash();
      this.game.particles.emit(this.x, this.y, 20, {
        color: "#7af7ff", speedMin: 40, speedMax: 160, lifeMin: 0.2, lifeMax: 0.5,
      });
    }

    hurt(dmg) {
      if (this.invuln > 0 || this.dead) return;
      if (this.shield > 0) {
        this.shield = 0;
        this.invuln = 1.0;
        audio.hit();
        this.game.particles.burst(this.x, this.y, "#9b8cff");
        this.game.shake(8);
        return;
      }
      this.hp -= dmg;
      audio.playerHurt();
      this.game.shake(14);
      this.game.particles.explosion(this.x, this.y, "#ff5d6c", false);
      if (this.hp <= 0) {
        this.lives--;
        if (this.lives <= 0) {
          this.dead = true;
        } else {
          this.hp = this.maxHp;
          this.invuln = 2.2;
          this.spread = this.rapid = 0;
        }
      } else {
        this.invuln = 1.2;
      }
    }

    update(dt) {
      // Movement: keyboard axis OR pointer follow.
      if (input.pointerActive) {
        const dx = input.px - this.x;
        const dy = input.py - this.y;
        const d = Math.hypot(dx, dy);
        if (d > 2) {
          const mv = Math.min(d, this.speed * dt * (this.dashTime > 0 ? 2.4 : 1));
          this.x += (dx / d) * mv;
          this.y += (dy / d) * mv;
        }
      } else {
        const ax = input.axis();
        const boost = this.dashTime > 0 ? 2.4 : 1;
        this.x += ax.x * this.speed * boost * dt;
        this.y += ax.y * this.speed * boost * dt;
      }

      this.x = Utils.clamp(this.x, this.r, this.game.w - this.r);
      this.y = Utils.clamp(this.y, this.r, this.game.h - this.r);

      // Timers.
      this.invuln = Math.max(0, this.invuln - dt);
      this.shield = Math.max(0, this.shield - dt);
      this.spread = Math.max(0, this.spread - dt);
      this.rapid = Math.max(0, this.rapid - dt);
      this.dashCd = Math.max(0, this.dashCd - dt);
      this.dashTime = Math.max(0, this.dashTime - dt);
      this.thruster += dt * 30;

      if (input.dashPressed) this.dash();

      // Firing (auto).
      this.fireCd -= dt;
      if (this.fireCd <= 0) {
        this.fire();
        this.fireCd = this.fireRate;
      }

      // Engine trail.
      if (Math.random() < 0.8) {
        this.game.particles.emit(this.x, this.y + this.r, 1, {
          color: Utils.chance(0.5) ? "#46e8ff" : "#9b8cff",
          angle: Math.PI / 2, spread: 0.4, speedMin: 60, speedMax: 140,
          lifeMin: 0.15, lifeMax: 0.35, sizeMin: 1.5, sizeMax: 3,
        });
      }
    }

    fire() {
      const focused = input.fireHeld;
      const speed = 720;
      const make = (angOffset) => {
        const ang = -Math.PI / 2 + angOffset;
        this.game.bullets.push(new Bullet(this.x, this.y - this.r, Math.cos(ang) * speed, Math.sin(ang) * speed, {
          friendly: true, dmg: 1, r: 4, color: "#7af7ff",
        }));
      };
      if (this.spread > 0) {
        make(-0.22); make(0); make(0.22);
        if (focused) { make(-0.42); make(0.42); }
      } else {
        make(0);
        if (focused) { make(-0.12); make(0.12); }
      }
      audio.shoot();
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      // Blink while invulnerable.
      if (this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0) ctx.globalAlpha = 0.4;

      // Shield ring.
      if (this.shield > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const a = 0.4 + 0.3 * Math.sin(this.thruster);
        ctx.strokeStyle = Utils.hsl(255, 90, 75, a);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.r + 10, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // Thruster flame.
      const flame = this.r + 8 + Math.sin(this.thruster) * 4;
      const fg = ctx.createLinearGradient(0, this.r, 0, this.r + flame);
      fg.addColorStop(0, "#7af7ff");
      fg.addColorStop(1, "rgba(122,247,255,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(-5, this.r);
      ctx.lineTo(5, this.r);
      ctx.lineTo(0, this.r + flame);
      ctx.closePath();
      ctx.fill();

      // Ship body.
      ctx.fillStyle = "#dfeaff";
      ctx.strokeStyle = "#46e8ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -this.r - 2);
      ctx.lineTo(this.r, this.r);
      ctx.lineTo(this.r * 0.4, this.r * 0.5);
      ctx.lineTo(-this.r * 0.4, this.r * 0.5);
      ctx.lineTo(-this.r, this.r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit.
      ctx.fillStyle = "#ff4fd8";
      ctx.beginPath();
      ctx.arc(0, -2, 4, 0, TAU);
      ctx.fill();

      ctx.restore();
    }
  }

  /* ============================ ENEMY ============================ */
  // type: "grunt" | "zigzag" | "diver" | "turret"
  class Enemy {
    constructor(game, type, x, y, hp) {
      this.game = game;
      this.type = type;
      this.x = x; this.y = y;
      this.r = 15;
      this.hp = hp;
      this.maxHp = hp;
      this.dead = false;
      this.t = Utils.rand(0, TAU);
      this.vx = 0; this.vy = Utils.rand(50, 80);
      this.fireCd = Utils.rand(1.2, 2.6);
      this.flash = 0;
      this.score = 100;
      switch (type) {
        case "grunt": this.color = "#ff5d6c"; this.hue = 350; break;
        case "zigzag": this.color = "#ffd166"; this.hue = 45; this.vy = Utils.rand(40, 70); break;
        case "diver": this.color = "#b06dff"; this.hue = 270; this.score = 150; break;
        case "turret": this.color = "#6dff9e"; this.hue = 140; this.vy = 30; this.score = 200; this.r = 17; break;
      }
    }

    hurt(dmg) {
      this.hp -= dmg;
      this.flash = 0.08;
      if (this.hp <= 0) this.dead = true;
    }

    update(dt) {
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt);

      switch (this.type) {
        case "grunt":
          this.y += this.vy * dt;
          this.x += Math.sin(this.t * 1.5) * 30 * dt;
          break;
        case "zigzag":
          this.y += this.vy * dt;
          this.x += Math.sin(this.t * 3) * 140 * dt;
          break;
        case "diver": {
          // Approaches then dives toward last-known player x.
          this.y += this.vy * dt;
          if (this.y < this.game.h * 0.35) {
            this.x += Math.sin(this.t * 2) * 40 * dt;
          } else {
            const dir = Math.sign(this.game.player.x - this.x) || 1;
            this.x += dir * 130 * dt;
            this.vy = Math.min(this.vy + 120 * dt, 300);
          }
          break;
        }
        case "turret":
          this.y += this.vy * dt;
          if (this.y > this.game.h * 0.22) this.vy = 0;
          break;
      }

      this.x = Utils.clamp(this.x, this.r, this.game.w - this.r);

      // Shooting.
      if (this.type !== "diver") {
        this.fireCd -= dt;
        if (this.fireCd <= 0 && this.y > 0 && this.y < this.game.h * 0.7) {
          this.shoot();
          this.fireCd = this.type === "turret" ? Utils.rand(1.0, 1.8) : Utils.rand(1.8, 3.4);
        }
      }

      if (this.y > this.game.h + 40) this.dead = true; // off-screen
    }

    shoot() {
      const ang = Utils.angleTo(this.x, this.y, this.game.player.x, this.game.player.y);
      const spd = this.type === "turret" ? 300 : 240;
      if (this.type === "turret") {
        for (const off of [-0.25, 0, 0.25]) {
          this.game.enemyBullets.push(new Bullet(this.x, this.y, Math.cos(ang + off) * spd, Math.sin(ang + off) * spd, { friendly: false, r: 5, dmg: 12 }));
        }
      } else {
        this.game.enemyBullets.push(new Bullet(this.x, this.y, Math.cos(ang) * spd, Math.sin(ang) * spd, { friendly: false, r: 5, dmg: 10 }));
      }
      audio.enemyShoot();
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const wob = Math.sin(this.t * 4) * 0.1;
      ctx.rotate(wob);

      const col = this.flash > 0 ? "#ffffff" : this.color;
      ctx.fillStyle = col;
      ctx.strokeStyle = Utils.hsl(this.hue, 90, 75);
      ctx.lineWidth = 2;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;

      switch (this.type) {
        case "grunt":
          ctx.beginPath();
          ctx.moveTo(0, this.r);
          ctx.lineTo(this.r, -this.r * 0.6);
          ctx.lineTo(0, -this.r * 0.3);
          ctx.lineTo(-this.r, -this.r * 0.6);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          break;
        case "zigzag":
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            const rr = i % 2 === 0 ? this.r : this.r * 0.55;
            ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          break;
        case "diver":
          ctx.beginPath();
          ctx.moveTo(0, this.r + 4);
          ctx.lineTo(this.r * 0.8, -this.r);
          ctx.lineTo(-this.r * 0.8, -this.r);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          break;
        case "turret":
          ctx.beginPath();
          ctx.arc(0, 0, this.r, 0, TAU);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#02030a";
          ctx.fillRect(-3, -this.r - 4, 6, 10);
          break;
      }

      // Eye/core.
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#02030a";
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, TAU);
      ctx.fill();
      ctx.restore();

      // Health bar for tougher enemies.
      if (this.maxHp > 2 && this.hp < this.maxHp) {
        const w = this.r * 2;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(this.x - w / 2, this.y - this.r - 10, w, 4);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - w / 2, this.y - this.r - 10, w * (this.hp / this.maxHp), 4);
      }
    }
  }

  /* ============================ BOSS ============================ */
  class Boss {
    constructor(game, level) {
      this.game = game;
      this.level = level;
      this.r = 56;
      this.x = game.w / 2;
      this.y = -80;
      this.targetY = 130;
      this.maxHp = 120 + level * 90;
      this.hp = this.maxHp;
      this.t = 0;
      this.phase = "enter";
      this.dir = 1;
      this.fireCd = 1.5;
      this.spinFireCd = 0;
      this.flash = 0;
      this.dead = false;
      this.score = 2000 + level * 1000;
      this.angle = 0;
    }

    hurt(dmg) {
      this.hp -= dmg;
      this.flash = 0.06;
      if (this.hp <= 0) this.dead = true;
    }

    update(dt) {
      this.t += dt;
      this.angle += dt * 1.2;
      this.flash = Math.max(0, this.flash - dt);

      if (this.phase === "enter") {
        this.y += (this.targetY - this.y) * Math.min(1, dt * 2);
        if (Math.abs(this.y - this.targetY) < 2) this.phase = "fight";
        return;
      }

      // Side-to-side sweep.
      this.x += this.dir * (90 + this.level * 10) * dt;
      if (this.x < this.r + 20) { this.x = this.r + 20; this.dir = 1; }
      if (this.x > this.game.w - this.r - 20) { this.x = this.game.w - this.r - 20; this.dir = -1; }

      // Aimed volleys.
      this.fireCd -= dt;
      if (this.fireCd <= 0) {
        this.aimedVolley();
        this.fireCd = Math.max(0.7, 1.6 - this.level * 0.1);
      }

      // Radial spin attack, more intense at low HP.
      this.spinFireCd -= dt;
      const enraged = this.hp < this.maxHp * 0.4;
      if (this.spinFireCd <= 0) {
        this.radialBurst(enraged);
        this.spinFireCd = enraged ? 0.12 : 0.2;
      }
    }

    aimedVolley() {
      const base = Utils.angleTo(this.x, this.y, this.game.player.x, this.game.player.y);
      for (const off of [-0.3, -0.15, 0, 0.15, 0.3]) {
        this.game.enemyBullets.push(new Bullet(this.x, this.y + this.r * 0.5, Math.cos(base + off) * 280, Math.sin(base + off) * 280, {
          friendly: false, r: 6, dmg: 14, color: "#ff4fd8",
        }));
      }
      audio.enemyShoot();
    }

    radialBurst(enraged) {
      const n = enraged ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const a = this.angle + (i / n) * TAU;
        this.game.enemyBullets.push(new Bullet(this.x, this.y, Math.cos(a) * 180, Math.sin(a) * 180, {
          friendly: false, r: 5, dmg: 10, color: "#ff9bec",
        }));
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Outer rotating ring.
      ctx.save();
      ctx.rotate(this.angle);
      ctx.strokeStyle = "rgba(255,79,216,0.6)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (this.r + 14), Math.sin(a) * (this.r + 14), 6, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();

      // Core body.
      const col = this.flash > 0 ? "#ffffff" : "#3a1840";
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, this.r);
      g.addColorStop(0, this.flash > 0 ? "#ffffff" : "#ff4fd8");
      g.addColorStop(1, col);
      ctx.fillStyle = g;
      ctx.strokeStyle = "#ff9bec";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#ff4fd8";
      ctx.shadowBlur = 24;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + this.angle * 0.3;
        const rr = i % 2 === 0 ? this.r : this.r * 0.78;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eye.
      ctx.shadowBlur = 0;
      const eye = 0.5 + 0.5 * Math.sin(this.t * 3);
      ctx.fillStyle = Utils.hsl(300, 90, 50 + eye * 30);
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#02030a";
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, TAU);
      ctx.fill();

      ctx.restore();
    }
  }

  /* ============================ POWER-UP ============================ */
  const POWER_TYPES = ["spread", "rapid", "shield", "heal"];
  const POWER_META = {
    spread: { color: "#46e8ff", label: "S" },
    rapid: { color: "#ffd166", label: "R" },
    shield: { color: "#9b8cff", label: "+" },
    heal: { color: "#6dff9e", label: "H" },
  };

  class PowerUp {
    constructor(game, x, y, type) {
      this.game = game;
      this.x = x; this.y = y;
      this.type = type || Utils.pick(POWER_TYPES);
      this.r = 12;
      this.vy = 70;
      this.t = Utils.rand(0, TAU);
      this.dead = false;
    }
    update(dt) {
      this.t += dt;
      this.y += this.vy * dt;
      this.x += Math.sin(this.t * 2) * 24 * dt;
      if (this.y > this.game.h + 30) this.dead = true;
    }
    draw(ctx) {
      const meta = POWER_META[this.type];
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.globalCompositeOperation = "lighter";
      const pulse = 0.6 + 0.4 * Math.sin(this.t * 5);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r * 2.2);
      g.addColorStop(0, meta.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, this.r * 2.2 * pulse, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.t);
      ctx.strokeStyle = meta.color;
      ctx.fillStyle = "rgba(2,3,10,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.lineTo(Math.cos(a) * this.r, Math.sin(a) * this.r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = meta.color;
      ctx.font = "bold 14px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(meta.label, this.x, this.y + 1);
      ctx.textBaseline = "alphabetic";
    }
  }

  global.Bullet = Bullet;
  global.Player = Player;
  global.Enemy = Enemy;
  global.Boss = Boss;
  global.PowerUp = PowerUp;
})(window);
