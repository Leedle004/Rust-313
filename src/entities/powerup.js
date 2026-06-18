import { TAU } from "../utils.js";

// Drop types that fall toward the player when an enemy is destroyed.
export const POWERUP_TYPES = {
  weapon: { color: "#ffd84d", glyph: "▲", label: "武器升级" },
  shield: { color: "#38e1ff", glyph: "◈", label: "护盾" },
  life: { color: "#ff4d8d", glyph: "♥", label: "生命" },
};

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 14;
    this.vy = 70;
    this.t = 0;
    this.dead = false;
  }

  update(dt, w, h) {
    this.t += dt;
    this.y += this.vy * dt;
    this.x += Math.sin(this.t * 3) * 18 * dt; // gentle drift
    if (this.y > h + 30) this.dead = true;
  }

  draw(ctx) {
    const info = POWERUP_TYPES[this.type];
    const pulse = 1 + Math.sin(this.t * 6) * 0.08;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = info.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = "rgba(8,12,32,0.85)";
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = info.color;
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(info.glyph, 0, 1);
    ctx.restore();
  }
}
