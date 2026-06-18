import { rand, TAU, choice } from "../utils.js";

// A single short-lived spark used for explosions and thruster trails.
export class Particle {
  constructor(x, y, color, opts = {}) {
    const angle = opts.angle ?? rand(0, TAU);
    const speed = opts.speed ?? rand(40, 220);
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = opts.life ?? rand(0.3, 0.8);
    this.maxLife = this.life;
    this.size = opts.size ?? rand(1.5, 4);
    this.color = color;
    this.gravity = opts.gravity ?? 0;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const t = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = t;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * t, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Helper: spawn an explosion burst into the provided particle array.
export function explode(particles, x, y, count, colors, opts = {}) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, choice(colors), {
      speed: rand(opts.minSpeed ?? 40, opts.maxSpeed ?? 240),
      life: rand(opts.minLife ?? 0.3, opts.maxLife ?? 0.9),
      size: rand(opts.minSize ?? 1.5, opts.maxSize ?? 4.5),
    }));
  }
}
