import { TAU } from "../utils.js";

// Projectile fired by the player or enemies. `friendly` decides who it hurts.
export class Bullet {
  constructor(x, y, vx, vy, opts = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.friendly = opts.friendly ?? true;
    this.radius = opts.radius ?? 4;
    this.damage = opts.damage ?? 1;
    this.color = opts.color ?? (this.friendly ? "#7df9ff" : "#ff6a6a");
    this.len = opts.len ?? 12;
    this.dead = false;
  }

  update(dt, w, h) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -30 || this.y > h + 30 || this.x < -30 || this.x > w + 30) {
      this.dead = true;
    }
  }

  draw(ctx) {
    const speed = Math.hypot(this.vx, this.vy) || 1;
    const ux = this.vx / speed;
    const uy = this.vy / speed;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = this.radius * 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - ux * this.len, this.y - uy * this.len);
    ctx.stroke();
    ctx.restore();
    // Bright core dot.
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.55, 0, TAU);
    ctx.fill();
  }
}
