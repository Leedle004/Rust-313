// Parallax starfield drawn behind everything for a sense of motion.
import { rand } from "./utils.js";

export class Starfield {
  constructor(width, height, count = 140) {
    this.w = width;
    this.h = height;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      const layer = Math.random();
      this.stars.push({
        x: rand(0, width),
        y: rand(0, height),
        z: layer, // depth: 0 (far) .. 1 (near)
        size: layer < 0.4 ? 1 : layer < 0.8 ? 1.5 : 2.5,
        speed: 20 + layer * 90,
      });
    }
  }

  resize(width, height) {
    this.w = width;
    this.h = height;
  }

  update(dt, speedMul = 1) {
    for (const s of this.stars) {
      s.y += s.speed * speedMul * dt;
      if (s.y > this.h) {
        s.y = -2;
        s.x = rand(0, this.w);
      }
    }
  }

  draw(ctx) {
    for (const s of this.stars) {
      ctx.globalAlpha = 0.35 + s.z * 0.65;
      ctx.fillStyle = s.z > 0.8 ? "#bfe6ff" : "#ffffff";
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }
}
