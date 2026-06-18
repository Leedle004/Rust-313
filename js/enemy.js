// Enemy ships with several archetypes plus a boss that appears every few waves.
const ENEMY_TYPES = {
  grunt: { health: 1, radius: 15, speed: 90, score: 100, color: "#ff6b6b", fireChance: 0.004 },
  diver: { health: 2, radius: 16, speed: 150, score: 160, color: "#ffa94d", fireChance: 0.006 },
  weaver: { health: 3, radius: 17, speed: 80, score: 220, color: "#cc5de8", fireChance: 0.012 },
  tank: { health: 7, radius: 24, speed: 50, score: 400, color: "#f783ac", fireChance: 0.01 },
};

class Enemy {
  constructor(game, type, x, y) {
    this.game = game;
    this.type = type;
    const def = ENEMY_TYPES[type];
    this.x = x;
    this.y = y;
    this.radius = def.radius;
    this.maxHealth = def.health;
    this.health = def.health;
    this.speed = def.speed;
    this.score = def.score;
    this.color = def.color;
    this.fireChance = def.fireChance;
    this.dead = false;
    this.t = Utils.rand(0, 10);
    this.hitFlash = 0;
    this.baseX = x;
  }

  hurt(dmg) {
    this.health -= dmg;
    this.hitFlash = 0.08;
    if (this.health <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  update(dt) {
    this.t += dt;
    const h = this.game.height;
    const w = this.game.width;

    switch (this.type) {
      case "diver":
        this.y += this.speed * dt;
        this.x += Math.sin(this.t * 3) * 60 * dt;
        break;
      case "weaver":
        this.y += this.speed * dt;
        this.x = this.baseX + Math.sin(this.t * 2) * 120;
        break;
      case "tank":
        this.y += this.speed * dt;
        break;
      default: // grunt
        this.y += this.speed * dt;
        this.x += Math.sin(this.t * 1.5) * 30 * dt;
        break;
    }

    this.x = Utils.clamp(this.x, this.radius, w - this.radius);
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // Shooting.
    const diff = 1 + this.game.wave * 0.06;
    if (this.y > 0 && Math.random() < this.fireChance * diff) this.fire();

    if (this.y > h + 40) this.dead = true;
  }

  fire() {
    const p = this.game.player;
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    const spd = 230;
    this.game.bullets.push(new Bullet(this.x, this.y + this.radius, Math.cos(ang) * spd, Math.sin(ang) * spd, {
      friendly: false, damage: 12, radius: 4, color: "#ff5d5d",
    }));
    Sound.enemyShoot();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const c = this.hitFlash > 0 ? "#ffffff" : this.color;

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = c;

    if (this.type === "tank") {
      ctx.beginPath();
      ctx.moveTo(0, this.radius);
      ctx.lineTo(this.radius, -4);
      ctx.lineTo(this.radius * 0.5, -this.radius);
      ctx.lineTo(-this.radius * 0.5, -this.radius);
      ctx.lineTo(-this.radius, -4);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === "weaver") {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Utils.TAU + Math.PI / 2;
        const r = i % 2 === 0 ? this.radius : this.radius * 0.55;
        ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // grunt / diver: inverted ship.
      ctx.beginPath();
      ctx.moveTo(0, this.radius);
      ctx.lineTo(this.radius, -this.radius * 0.6);
      ctx.lineTo(0, -this.radius * 0.3);
      ctx.lineTo(-this.radius, -this.radius * 0.6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Core.
    ctx.fillStyle = "#1a0a14";
    ctx.beginPath();
    ctx.arc(0, -2, this.radius * 0.28, 0, Utils.TAU);
    ctx.fill();

    // Health bar for tougher enemies.
    if (this.maxHealth > 2 && this.health < this.maxHealth) {
      const bw = this.radius * 2;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(-bw / 2, -this.radius - 9, bw, 4);
      ctx.fillStyle = "#38ef7d";
      ctx.fillRect(-bw / 2, -this.radius - 9, bw * (this.health / this.maxHealth), 4);
    }
    ctx.restore();
  }
}

class Boss {
  constructor(game, wave) {
    this.game = game;
    this.radius = 56;
    this.x = game.width / 2;
    this.y = -80;
    this.targetY = 120;
    this.maxHealth = 60 + wave * 22;
    this.health = this.maxHealth;
    this.score = 3000 + wave * 200;
    this.color = "#f72585";
    this.dead = false;
    this.t = 0;
    this.dir = 1;
    this.fireTimer = 0;
    this.phase = 0;
    this.entering = true;
    this.isBoss = true;
    this.hitFlash = 0;
  }

  hurt(dmg) {
    if (this.entering) return false;
    this.health -= dmg;
    this.hitFlash = 0.06;
    if (this.health <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  update(dt) {
    this.t += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (this.entering) {
      this.y += (this.targetY - this.y) * Math.min(1, dt * 2);
      if (Math.abs(this.y - this.targetY) < 2) this.entering = false;
      return;
    }

    this.x += this.dir * 90 * dt;
    if (this.x < this.radius + 20) this.dir = 1;
    if (this.x > this.game.width - this.radius - 20) this.dir = -1;
    this.y = this.targetY + Math.sin(this.t * 1.5) * 24;

    this.fireTimer -= dt;
    const hpRatio = this.health / this.maxHealth;
    const interval = hpRatio < 0.4 ? 0.9 : 1.4;
    if (this.fireTimer <= 0) {
      this.fireTimer = interval;
      this.attack(hpRatio);
    }
  }

  attack(hpRatio) {
    const p = this.game.player;
    const b = this.game.bullets;
    // Aimed triple.
    const ang = Math.atan2(p.y - this.y, p.x - this.x);
    for (let i = -1; i <= 1; i++) {
      const a = ang + i * 0.22;
      b.push(new Bullet(this.x, this.y + 30, Math.cos(a) * 260, Math.sin(a) * 260, {
        friendly: false, damage: 14, radius: 5, color: "#ff8fd6",
      }));
    }
    // Radial burst in later phase.
    if (hpRatio < 0.6) {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Utils.TAU + this.t;
        b.push(new Bullet(this.x, this.y, Math.cos(a) * 180, Math.sin(a) * 180, {
          friendly: false, damage: 12, radius: 4, color: "#ffb3e6",
        }));
      }
    }
    Sound.enemyShoot();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const c = this.hitFlash > 0 ? "#ffffff" : this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 24;

    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, this.radius);
    ctx.lineTo(this.radius, 0);
    ctx.lineTo(this.radius * 0.6, -this.radius * 0.7);
    ctx.lineTo(-this.radius * 0.6, -this.radius * 0.7);
    ctx.lineTo(-this.radius, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#2a0a1e";
    ctx.beginPath();
    ctx.arc(0, -6, this.radius * 0.3, 0, Utils.TAU);
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(0, -6, this.radius * 0.14, 0, Utils.TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Boss health bar at top of screen.
    const w = this.game.width;
    const bw = w * 0.7;
    const bx = (w - bw) / 2;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(bx, 14, bw, 10);
    ctx.fillStyle = "#f72585";
    ctx.fillRect(bx, 14, bw * Math.max(0, this.health / this.maxHealth), 10);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.strokeRect(bx, 14, bw, 10);
  }
}
