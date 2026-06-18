import { rand, TAU, clamp } from "../utils.js";
import { Bullet } from "./bullet.js";

// Enemy archetypes. `make` builds a configured Enemy for the spawner.
export const ENEMY_TYPES = {
  // Straight diving fighter.
  grunt: {
    hp: 1, radius: 16, score: 100, color: "#ff6a6a", speed: 110, canShoot: false,
    drop: 0.12,
  },
  // Sine-weaving scout.
  weaver: {
    hp: 2, radius: 15, score: 150, color: "#ff9d4d", speed: 95, canShoot: false,
    weave: true, drop: 0.16,
  },
  // Slow gunner that fires aimed shots.
  gunner: {
    hp: 3, radius: 18, score: 250, color: "#c46bff", speed: 70, canShoot: true,
    fireRate: 1.6, drop: 0.25,
  },
  // Tanky brute.
  tank: {
    hp: 6, radius: 24, score: 400, color: "#ff4d8d", speed: 55, canShoot: true,
    fireRate: 2.2, drop: 0.4,
  },
};

export class Enemy {
  constructor(typeKey, x, y, levelScale = 1) {
    const t = ENEMY_TYPES[typeKey];
    this.type = typeKey;
    this.cfg = t;
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.radius = t.radius;
    this.maxHp = Math.round(t.hp * levelScale);
    this.hp = this.maxHp;
    this.score = t.score;
    this.color = t.color;
    this.speed = t.speed * (0.85 + levelScale * 0.15);
    this.canShoot = t.canShoot;
    this.fireRate = t.fireRate ?? 0;
    this.fireTimer = rand(0.5, this.fireRate || 1.5);
    this.weave = t.weave ?? false;
    this.drop = t.drop;
    this.t = 0;
    this.dead = false;
    this.hitFlash = 0;
    this.isBoss = false;
  }

  update(dt, w, h, player, enemyBullets, audio) {
    this.t += dt;
    this.y += this.speed * dt;
    if (this.weave) {
      this.x = this.baseX + Math.sin(this.t * 2.4) * 70;
    }
    this.x = clamp(this.x, this.radius, w - this.radius);
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (this.canShoot && player && !player.dead) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && this.y < h * 0.7) {
        this.fireTimer = this.fireRate;
        const a = Math.atan2(player.y - this.y, player.x - this.x);
        const s = 240;
        enemyBullets.push(new Bullet(this.x, this.y + this.radius,
          Math.cos(a) * s, Math.sin(a) * s,
          { friendly: false, radius: 5, color: "#ff6a6a" }));
        audio?.enemyShoot();
      }
    }

    if (this.y > h + 40) this.dead = true;
  }

  hit(damage) {
    this.hp -= damage;
    this.hitFlash = 0.08;
    if (this.hp <= 0) {
      this.dead = true;
      return true; // destroyed
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const flash = this.hitFlash > 0;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = flash ? "#ffffff" : this.color;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.5;

    const r = this.radius;
    ctx.beginPath();
    // Inverted, slightly menacing arrow shape (pointing down at the player).
    ctx.moveTo(0, r);
    ctx.lineTo(r, -r * 0.6);
    ctx.lineTo(r * 0.4, -r);
    ctx.lineTo(-r * 0.4, -r);
    ctx.lineTo(-r, -r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Core.
    ctx.shadowBlur = 0;
    ctx.fillStyle = flash ? "#ffd84d" : "rgba(8,12,32,0.85)";
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r * 0.32, 0, TAU);
    ctx.fill();
    ctx.restore();

    // HP bar for multi-hit enemies.
    if (this.maxHp > 2 && this.hp < this.maxHp) {
      const bw = this.radius * 2;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(this.x - bw / 2, this.y - this.radius - 10, bw, 4);
      ctx.fillStyle = "#4dff9e";
      ctx.fillRect(this.x - bw / 2, this.y - this.radius - 10, bw * (this.hp / this.maxHp), 4);
    }
  }
}

// Boss enemy: stays near top, sweeps horizontally, fires bullet patterns.
export class Boss {
  constructor(w, h, level) {
    this.x = w / 2;
    this.y = -80;
    this.targetY = 110;
    this.w = w;
    this.radius = 52;
    this.maxHp = 120 + level * 50;
    this.hp = this.maxHp;
    this.score = 3000 + level * 1000;
    this.color = "#ff4d8d";
    this.speed = 90 + level * 8;
    this.dir = 1;
    this.t = 0;
    this.fireTimer = 1.2;
    this.burstTimer = 4;
    this.entering = true;
    this.dead = false;
    this.hitFlash = 0;
    this.isBoss = true;
    this.drop = 1;
    this.level = level;
  }

  update(dt, w, h, player, enemyBullets, audio) {
    this.t += dt;
    this.w = w;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (this.entering) {
      this.y += 80 * dt;
      if (this.y >= this.targetY) { this.y = this.targetY; this.entering = false; }
      return;
    }

    this.x += this.speed * this.dir * dt;
    if (this.x < this.radius) { this.x = this.radius; this.dir = 1; }
    if (this.x > w - this.radius) { this.x = w - this.radius; this.dir = -1; }
    this.y = this.targetY + Math.sin(this.t * 1.5) * 18;

    // Aimed steady fire.
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && player && !player.dead) {
      this.fireTimer = 0.7;
      const a = Math.atan2(player.y - this.y, player.x - this.x);
      const s = 260;
      for (const off of [-0.18, 0, 0.18]) {
        enemyBullets.push(new Bullet(this.x, this.y + 30,
          Math.cos(a + off) * s, Math.sin(a + off) * s,
          { friendly: false, radius: 6, color: "#ff6a6a" }));
      }
      audio?.enemyShoot();
    }

    // Radial bullet burst.
    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      this.burstTimer = 3.4;
      const n = 18;
      const s = 180;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + this.t;
        enemyBullets.push(new Bullet(this.x, this.y,
          Math.cos(a) * s, Math.sin(a) * s,
          { friendly: false, radius: 5, color: "#ffd84d" }));
      }
      audio?.enemyShoot();
    }
  }

  hit(damage) {
    this.hp -= damage;
    this.hitFlash = 0.06;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const flash = this.hitFlash > 0;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 24;
    ctx.fillStyle = flash ? "#ffffff" : "#2a0f2a";
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    const r = this.radius;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.7);
    ctx.lineTo(r, 0);
    ctx.lineTo(r * 0.7, -r * 0.7);
    ctx.lineTo(0, -r * 0.4);
    ctx.lineTo(-r * 0.7, -r * 0.7);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Eye / core.
    ctx.shadowBlur = 16;
    ctx.fillStyle = flash ? "#ffd84d" : "#ff4d8d";
    ctx.beginPath();
    ctx.arc(0, -r * 0.05, r * 0.28, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawHealthBar(ctx, w) {
    const bw = w - 60;
    const x = 30;
    const y = 44;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x, y, bw, 8);
    ctx.fillStyle = "#ff4d8d";
    ctx.fillRect(x, y, bw * clamp(this.hp / this.maxHp, 0, 1), 8);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, bw, 8);
    ctx.fillStyle = "#ffd1e4";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BOSS", w / 2, y - 4);
  }
}
