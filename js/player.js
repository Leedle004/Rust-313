// The player's ship: movement, shooting patterns, shield and invulnerability.
class Player {
  constructor(game) {
    this.game = game;
    this.radius = 16;
    this.x = game.width / 2;
    this.y = game.height - 80;
    this.speed = 360;
    this.maxHealth = 100;
    this.health = 100;
    this.lives = 3;
    this.weaponLevel = 1;
    this.fireCooldown = 0;
    this.fireRate = 0.18;
    this.invuln = 1.2;
    this.thrust = 0;
    this.dead = false;
  }

  get weaponName() {
    return ["单发", "双发", "三连", "散射", "全弹幕"][Math.min(this.weaponLevel - 1, 4)];
  }

  upgradeWeapon() {
    this.weaponLevel = Math.min(this.weaponLevel + 1, 5);
  }

  addShield(amount) {
    this.health = Utils.clamp(this.health + amount, 0, this.maxHealth);
  }

  hurt(dmg) {
    if (this.invuln > 0) return false;
    this.health -= dmg;
    Sound.hit();
    if (this.health <= 0) {
      this.health = 0;
      this.lives -= 1;
      if (this.lives > 0) {
        this.health = this.maxHealth;
        this.invuln = 2;
        this.weaponLevel = Math.max(1, this.weaponLevel - 1);
      } else {
        this.dead = true;
      }
      return true; // ship destroyed
    }
    this.invuln = 0.6;
    return false;
  }

  update(dt, input) {
    const w = this.game.width;
    const h = this.game.height;

    let dx = 0;
    let dy = 0;
    if (input.useMouse && input.mouseX != null) {
      const tx = input.mouseX;
      const ty = input.mouseY;
      const ddx = tx - this.x;
      const ddy = ty - this.y;
      const d = Math.hypot(ddx, ddy);
      if (d > 2) {
        const step = Math.min(d, this.speed * dt);
        this.x += (ddx / d) * step;
        this.y += (ddy / d) * step;
      }
      this.thrust = d > 6 ? 1 : 0.4;
    } else {
      if (input.left) dx -= 1;
      if (input.right) dx += 1;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      const len = Math.hypot(dx, dy) || 1;
      this.x += (dx / len) * this.speed * dt;
      this.y += (dy / len) * this.speed * dt;
      this.thrust = dx || dy ? 1 : 0.4;
    }

    this.x = Utils.clamp(this.x, this.radius, w - this.radius);
    this.y = Utils.clamp(this.y, this.radius, h - this.radius);

    if (this.invuln > 0) this.invuln -= dt;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    if (input.fire && this.fireCooldown <= 0) {
      this.shoot();
      this.fireCooldown = this.fireRate;
    }

    // Engine trail particles.
    if (Math.random() < 0.8) {
      this.game.particles.push(new Particle(this.x + Utils.rand(-4, 4), this.y + this.radius, {
        angle: Math.PI / 2 + Utils.rand(-0.3, 0.3),
        speed: Utils.rand(60, 140) * this.thrust,
        life: Utils.rand(0.2, 0.45),
        size: Utils.rand(1.5, 3.5),
        color: Utils.choice(["#4cc9f0", "#7df9ff", "#a0e9ff"]),
      }));
    }
  }

  shoot() {
    const b = this.game.bullets;
    const baseSpeed = -640;
    const mk = (offX, vx, vy) => b.push(new Bullet(this.x + offX, this.y - this.radius, vx, vy, {
      friendly: true, damage: 1, radius: 4, color: "#7df9ff",
    }));

    switch (this.weaponLevel) {
      case 1:
        mk(0, 0, baseSpeed);
        break;
      case 2:
        mk(-8, 0, baseSpeed);
        mk(8, 0, baseSpeed);
        break;
      case 3:
        mk(0, 0, baseSpeed);
        mk(-12, -60, baseSpeed);
        mk(12, 60, baseSpeed);
        break;
      case 4:
        mk(0, 0, baseSpeed);
        mk(-10, -140, baseSpeed * 0.96);
        mk(10, 140, baseSpeed * 0.96);
        mk(-16, -260, baseSpeed * 0.9);
        mk(16, 260, baseSpeed * 0.9);
        break;
      default: // level 5
        for (let i = -2; i <= 2; i++) {
          mk(i * 8, i * 110, baseSpeed * (1 - Math.abs(i) * 0.04));
        }
        mk(-22, -360, baseSpeed * 0.82);
        mk(22, 360, baseSpeed * 0.82);
        break;
    }
    Sound.shoot();
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Blink while invulnerable.
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    // Shield ring.
    if (this.invuln > 0) {
      ctx.strokeStyle = "rgba(76,201,240,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 7, 0, Utils.TAU);
      ctx.stroke();
    }

    // Engine glow.
    const flame = 10 + Math.sin(Date.now() / 40) * 4;
    ctx.fillStyle = "rgba(76,201,240,0.55)";
    ctx.beginPath();
    ctx.moveTo(-6, this.radius - 2);
    ctx.lineTo(0, this.radius + flame * this.thrust);
    ctx.lineTo(6, this.radius - 2);
    ctx.closePath();
    ctx.fill();

    // Ship body.
    ctx.shadowColor = "#4cc9f0";
    ctx.shadowBlur = 14;
    const grad = ctx.createLinearGradient(0, -this.radius, 0, this.radius);
    grad.addColorStop(0, "#eaf6ff");
    grad.addColorStop(1, "#3a7bd5");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius - 2);
    ctx.lineTo(this.radius, this.radius);
    ctx.lineTo(6, this.radius - 6);
    ctx.lineTo(-6, this.radius - 6);
    ctx.lineTo(-this.radius, this.radius);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cockpit.
    ctx.fillStyle = "#0b1b3a";
    ctx.beginPath();
    ctx.ellipse(0, -2, 4, 7, 0, 0, Utils.TAU);
    ctx.fill();

    ctx.restore();
  }
}
