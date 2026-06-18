// Drops that the player can collect: weapon upgrade, shield, screen-clearing bomb.
const POWERUP_TYPES = {
  power: { color: "#ffd166", letter: "P" },
  shield: { color: "#38ef7d", letter: "S" },
  bomb: { color: "#f72585", letter: "B" },
};

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 13;
    this.vy = 70;
    this.vx = Utils.rand(-20, 20);
    this.dead = false;
    this.t = 0;
  }

  static randomType() {
    const r = Math.random();
    if (r < 0.5) return "power";
    if (r < 0.82) return "shield";
    return "bomb";
  }

  update(dt, w, h) {
    this.t += dt;
    this.y += this.vy * dt;
    this.x += this.vx * dt;
    if (this.x < this.radius || this.x > w - this.radius) this.vx *= -1;
    if (this.y > h + 30) this.dead = true;
  }

  draw(ctx) {
    const def = POWERUP_TYPES[this.type];
    const pulse = 1 + Math.sin(this.t * 6) * 0.08;
    const r = this.radius * pulse;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Utils.TAU);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Utils.TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = def.color;
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.letter, 0, 1);
    ctx.restore();
  }
}
