// Projectiles fired by the player and enemies.
class Bullet {
  constructor(x, y, vx, vy, opts = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = opts.radius || 3.5;
    this.damage = opts.damage || 1;
    this.friendly = !!opts.friendly;
    this.color = opts.color || (this.friendly ? "#7df9ff" : "#ff5d5d");
    this.dead = false;
    this.trail = [];
  }

  update(dt, w, h) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 6) this.trail.shift();
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -20 || this.x > w + 20 || this.y < -20 || this.y > h + 20) this.dead = true;
  }

  draw(ctx) {
    // Glow trail.
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      ctx.globalAlpha = (i / this.trail.length) * 0.4;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.radius * 0.7, 0, Utils.TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Utils.TAU);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.6, 0, Utils.TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
