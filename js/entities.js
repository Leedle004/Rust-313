// Game entities: Player, Bullet, Enemy, PowerUp and Particle.
import { clamp, rand, TAU } from "./utils.js";

export class Bullet {
  constructor(x, y, vx, vy, opts = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.r = opts.r ?? 4;
    this.dead = false;
    this.friendly = opts.friendly ?? true;
    this.damage = opts.damage ?? 1;
    this.color = opts.color ?? (this.friendly ? "#38e1ff" : "#ff6b6b");
  }

  update(dt, w, h) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -20 || this.x > w + 20 || this.y < -20 || this.y > h + 20) {
      this.dead = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.r, this.r * 2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

export class Player {
  constructor(w, h) {
    this.x = w / 2;
    this.y = h - 90;
    this.r = 16;
    this.speed = 420;
    this.lives = 3;
    this.invuln = 0;          // seconds of invulnerability after a hit
    this.fireRate = 0.22;     // seconds between shots
    this.fireCooldown = 0;
    this.power = 1;           // weapon level 1..3
    this.powerTimer = 0;      // seconds remaining of upgraded weapon
    this.thruster = 0;
  }

  reset(w, h) {
    this.x = w / 2;
    this.y = h - 90;
    this.lives = 3;
    this.invuln = 2;
    this.power = 1;
    this.powerTimer = 0;
    this.fireCooldown = 0;
  }

  upgrade() {
    this.power = Math.min(3, this.power + 1);
    this.powerTimer = 12;
  }

  hit() {
    this.lives -= 1;
    this.invuln = 2.2;
    this.power = 1;
    this.powerTimer = 0;
  }

  update(dt, input, w, h) {
    // Steering: keyboard axis or pointer follow.
    if (input.usePointer && input.pointer.x != null) {
      const dx = input.pointer.x - this.x;
      const dy = input.pointer.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 2) {
        const step = Math.min(d, this.speed * dt);
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
      }
    } else {
      const a = input.axis();
      this.x += a.x * this.speed * dt;
      this.y += a.y * this.speed * dt;
    }

    this.x = clamp(this.x, this.r, w - this.r);
    this.y = clamp(this.y, this.r, h - this.r);

    if (this.invuln > 0) this.invuln -= dt;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.powerTimer > 0) {
      this.powerTimer -= dt;
      if (this.powerTimer <= 0) this.power = 1;
    }
    this.thruster = (this.thruster + dt * 30) % 100;
  }

  // Returns an array of bullets when firing, else empty.
  tryFire() {
    if (this.fireCooldown > 0) return [];
    this.fireCooldown = this.fireRate;
    const speed = -640;
    const bx = this.x;
    const by = this.y - this.r - 4;
    if (this.power === 1) {
      return [new Bullet(bx, by, 0, speed)];
    }
    if (this.power === 2) {
      return [
        new Bullet(bx - 10, by, 0, speed),
        new Bullet(bx + 10, by, 0, speed),
      ];
    }
    // power 3: triple spread
    return [
      new Bullet(bx, by, 0, speed),
      new Bullet(bx - 12, by, -160, speed),
      new Bullet(bx + 12, by, 160, speed),
    ];
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Blink while invulnerable.
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    // Thruster flame.
    const flame = 10 + Math.sin(this.thruster) * 5;
    ctx.fillStyle = "rgba(255,170,60,0.9)";
    ctx.beginPath();
    ctx.moveTo(-6, this.r - 2);
    ctx.lineTo(0, this.r + flame);
    ctx.lineTo(6, this.r - 2);
    ctx.closePath();
    ctx.fill();

    // Ship body.
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#38e1ff";
    const grad = ctx.createLinearGradient(0, -this.r, 0, this.r);
    grad.addColorStop(0, "#d8f6ff");
    grad.addColorStop(1, "#2aa9d6");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -this.r - 4);
    ctx.lineTo(this.r, this.r);
    ctx.lineTo(6, this.r - 4);
    ctx.lineTo(-6, this.r - 4);
    ctx.lineTo(-this.r, this.r);
    ctx.closePath();
    ctx.fill();

    // Cockpit.
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0a1f33";
    ctx.beginPath();
    ctx.ellipse(0, -2, 4, 7, 0, 0, TAU);
    ctx.fill();

    ctx.restore();
  }
}

const ENEMY_TYPES = {
  grunt:   { r: 16, hp: 1, speed: 90,  score: 100, color: "#ff7a8a", fire: 0 },
  diver:   { r: 14, hp: 1, speed: 180, score: 150, color: "#ffd166", fire: 0 },
  shooter: { r: 18, hp: 2, speed: 70,  score: 220, color: "#c792ff", fire: 1.8 },
  tank:    { r: 26, hp: 5, speed: 50,  score: 400, color: "#7af0c0", fire: 2.6 },
};

export class Enemy {
  constructor(type, x, y) {
    const cfg = ENEMY_TYPES[type];
    this.type = type;
    this.x = x;
    this.y = y;
    this.r = cfg.r;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.speed = cfg.speed;
    this.score = cfg.score;
    this.color = cfg.color;
    this.fireEvery = cfg.fire;
    this.fireTimer = rand(0.5, this.fireEvery || 1);
    this.dead = false;
    this.t = rand(0, TAU);
    this.swayAmp = type === "grunt" ? 40 : type === "shooter" ? 60 : 20;
    this.swayFreq = rand(1, 2.2);
    this.baseX = x;
    this.rot = 0;
  }

  // Returns an enemy bullet if it fires this frame, else null.
  update(dt, w, h, target) {
    this.t += dt;
    this.y += this.speed * dt;
    if (this.type !== "diver") {
      this.x = this.baseX + Math.sin(this.t * this.swayFreq) * this.swayAmp;
    }
    this.x = clamp(this.x, this.r, w - this.r);
    this.rot += dt * 1.5;

    if (this.y > h + 40) this.dead = true;

    if (this.fireEvery > 0 && this.y < h * 0.7) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.fireEvery;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        const spd = 240;
        return new Bullet(this.x, this.y + this.r, (dx / d) * spd, (dy / d) * spd, {
          friendly: false,
          r: 5,
          color: "#ff5b7f",
        });
      }
    }
    return null;
  }

  damage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
      return true; // destroyed
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowBlur = 14;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;

    if (this.type === "tank") {
      ctx.rotate(this.rot * 0.3);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const rr = this.r;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    } else if (this.type === "diver") {
      ctx.beginPath();
      ctx.moveTo(0, this.r);
      ctx.lineTo(this.r, -this.r);
      ctx.lineTo(-this.r, -this.r);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === "shooter") {
      ctx.beginPath();
      ctx.moveTo(0, this.r);
      ctx.lineTo(this.r, 0);
      ctx.lineTo(0, -this.r);
      ctx.lineTo(-this.r, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.r, 0, TAU);
      ctx.fill();
    }

    // Eye / core.
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(8,10,24,0.85)";
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 0.35, 0, TAU);
    ctx.fill();

    ctx.restore();

    // HP bar for tougher enemies.
    if (this.maxHp > 1 && this.hp < this.maxHp) {
      const w = this.r * 2;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(this.x - w / 2, this.y - this.r - 9, w, 4);
      ctx.fillStyle = "#7af0c0";
      ctx.fillRect(this.x - w / 2, this.y - this.r - 9, w * (this.hp / this.maxHp), 4);
    }
  }
}

export const POWERUP_KINDS = ["weapon", "life"];

export class PowerUp {
  constructor(x, y, kind) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.r = 13;
    this.vy = 90;
    this.dead = false;
    this.t = 0;
  }

  update(dt, w, h) {
    this.t += dt;
    this.y += this.vy * dt;
    this.x += Math.sin(this.t * 3) * 0.6;
    if (this.y > h + 30) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const pulse = 1 + Math.sin(this.t * 6) * 0.1;
    ctx.scale(pulse, pulse);
    const color = this.kind === "weapon" ? "#38e1ff" : "#ff4d8d";
    ctx.shadowBlur = 16;
    ctx.shadowColor = color;
    ctx.fillStyle = "rgba(8,12,28,0.85)";
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.kind === "weapon" ? "W" : "+", 0, 1);
    ctx.restore();
  }
}

export class Particle {
  constructor(x, y, color) {
    const a = rand(0, TAU);
    const s = rand(40, 260);
    this.x = x;
    this.y = y;
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.life = rand(0.3, 0.8);
    this.maxLife = this.life;
    this.size = rand(1.5, 4);
    this.color = color;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.94;
    this.vy *= 0.94;
  }

  draw(ctx) {
    const t = this.life / this.maxLife;
    ctx.globalAlpha = t;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}
