// Parallax scrolling starfield background.
class Starfield {
  constructor(width, height, count = 140) {
    this.w = width;
    this.h = height;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      const layer = Utils.randInt(0, 2);
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        layer,
        size: layer === 2 ? Utils.rand(1.6, 2.6) : layer === 1 ? Utils.rand(1, 1.6) : Utils.rand(0.5, 1),
        speed: layer === 2 ? Utils.rand(70, 110) : layer === 1 ? Utils.rand(35, 60) : Utils.rand(12, 28),
        twinkle: Math.random() * Utils.TAU,
      });
    }
  }

  update(dt, speedMul = 1) {
    for (const s of this.stars) {
      s.y += s.speed * speedMul * dt;
      s.twinkle += dt * 3;
      if (s.y > this.h) {
        s.y = -2;
        s.x = Math.random() * this.w;
      }
    }
  }

  draw(ctx) {
    for (const s of this.stars) {
      const a = 0.5 + 0.5 * Math.sin(s.twinkle);
      ctx.globalAlpha = s.layer === 0 ? 0.4 + a * 0.3 : 0.6 + a * 0.4;
      ctx.fillStyle = s.layer === 2 ? "#bcd4ff" : "#ffffff";
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }
}
