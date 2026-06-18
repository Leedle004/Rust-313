import { rand, TAU } from "../utils.js";

// Parallax starfield drawn behind everything for a sense of depth/motion.
export class Starfield {
  constructor(width, height, count = 90) {
    this.w = width;
    this.h = height;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      const depth = rand(0.2, 1); // closer stars are brighter and faster
      this.stars.push({
        x: rand(0, width),
        y: rand(0, height),
        r: depth * 1.8,
        speed: 20 + depth * 90,
        alpha: 0.3 + depth * 0.7,
      });
    }
  }

  resize(width, height) {
    this.w = width;
    this.h = height;
  }

  update(dt) {
    for (const s of this.stars) {
      s.y += s.speed * dt;
      if (s.y > this.h) {
        s.y = -2;
        s.x = rand(0, this.w);
      }
    }
  }

  draw(ctx) {
    for (const s of this.stars) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = "#bfe3ff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
