// Lightweight particle system for explosions, sparks and engine trails.
class Particle {
  constructor(x, y, opts = {}) {
    this.x = x;
    this.y = y;
    const ang = opts.angle != null ? opts.angle : Utils.rand(0, Utils.TAU);
    const spd = opts.speed != null ? opts.speed : Utils.rand(30, 220);
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    this.life = opts.life != null ? opts.life : Utils.rand(0.3, 0.8);
    this.maxLife = this.life;
    this.size = opts.size != null ? opts.size : Utils.rand(1.5, 4);
    this.color = opts.color || "#ffd166";
    this.gravity = opts.gravity || 0;
    this.shrink = opts.shrink != null ? opts.shrink : true;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const t = this.life / this.maxLife;
    ctx.globalAlpha = Math.max(0, t);
    ctx.fillStyle = this.color;
    const s = this.shrink ? this.size * t : this.size;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.4, s), 0, Utils.TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

const Particles = {
  burst(list, x, y, count, opts = {}) {
    for (let i = 0; i < count; i++) list.push(new Particle(x, y, opts));
  },
  explosion(list, x, y, color = "#ff9f1c", scale = 1) {
    const n = Math.round(18 * scale);
    for (let i = 0; i < n; i++) {
      list.push(new Particle(x, y, {
        speed: Utils.rand(40, 260) * scale,
        life: Utils.rand(0.35, 0.9),
        size: Utils.rand(2, 5) * scale,
        color: Utils.choice([color, "#ffd166", "#ffffff", "#ff5d5d"]),
      }));
    }
  },
};
