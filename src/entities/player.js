import { clamp, TAU } from "../utils.js";
import { Bullet } from "./bullet.js";
import { Particle } from "./particle.js";

// Weapon tiers: each level adds more bullets / spread.
const WEAPONS = [
  { name: "单发", cooldown: 0.22 },
  { name: "双发", cooldown: 0.2 },
  { name: "三向", cooldown: 0.18 },
  { name: "散射", cooldown: 0.16 },
  { name: "全弹幕", cooldown: 0.14 },
];

export class Player {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.x = w / 2;
    this.y = h - 90;
    this.radius = 16;
    this.speed = 360;
    this.weaponLevel = 0;
    this.fireTimer = 0;
    this.shield = 0; // 0..1 fraction of shield charge
    this.invuln = 0; // seconds of invulnerability after a hit
    this.thrust = 0;
    this.dead = false;
  }

  get weaponName() {
    return WEAPONS[this.weaponLevel].name;
  }

  upgradeWeapon() {
    this.weaponLevel = Math.min(WEAPONS.length - 1, this.weaponLevel + 1);
  }

  addShield(amount = 1) {
    this.shield = clamp(this.shield + amount, 0, 1);
  }

  reset() {
    this.x = this.w / 2;
    this.y = this.h - 90;
    this.invuln = 1.5;
  }

  resize(w, h) {
    this.x = clamp(this.x, this.radius, w - this.radius);
    this.y = clamp(this.y, this.radius, h - this.radius);
    this.w = w;
    this.h = h;
  }

  update(dt, input) {
    this.x += input.axisX * this.speed * dt;
    this.y += input.axisY * this.speed * dt;
    this.x = clamp(this.x, this.radius, this.w - this.radius);
    this.y = clamp(this.y, this.radius + 30, this.h - this.radius);
    this.thrust = input.axisY < -0.1 ? 1 : 0.5;
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.invuln > 0) this.invuln -= dt;
  }

  // Returns an array of new bullets if the weapon is off cooldown, else null.
  tryShoot() {
    if (this.fireTimer > 0) return null;
    const weapon = WEAPONS[this.weaponLevel];
    this.fireTimer = weapon.cooldown;
    const bullets = [];
    const speed = 620;
    const make = (angleDeg, offsetX = 0) => {
      const a = (-90 + angleDeg) * (Math.PI / 180);
      bullets.push(new Bullet(this.x + offsetX, this.y - 14,
        Math.cos(a) * speed, Math.sin(a) * speed,
        { friendly: true, radius: 4, damage: 1 }));
    };
    switch (this.weaponLevel) {
      case 0: make(0); break;
      case 1: make(0, -8); make(0, 8); break;
      case 2: make(0); make(-12); make(12); break;
      case 3: make(0, -8); make(0, 8); make(-18); make(18); break;
      default: make(0); make(-10); make(10); make(-22); make(22); make(0, -12); make(0, 12); break;
    }
    return bullets;
  }

  // Apply a hit; returns true if the player actually lost a life.
  takeHit() {
    if (this.invuln > 0) return false;
    if (this.shield > 0) {
      this.shield = 0;
      this.invuln = 1.2;
      return false; // shield absorbed it
    }
    this.invuln = 1.8;
    if (this.weaponLevel > 0) this.weaponLevel--; // lose a weapon tier on hit
    return true;
  }

  emitThruster(particles) {
    if (Math.random() > 0.6) return;
    particles.push(new Particle(this.x, this.y + this.radius + 2, "#7df9ff", {
      angle: Math.PI / 2 + (Math.random() - 0.5) * 0.5,
      speed: 80 + Math.random() * 120 * this.thrust,
      life: 0.25 + Math.random() * 0.2,
      size: 1.5 + Math.random() * 2,
    }));
  }

  draw(ctx) {
    const blink = this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0;
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.shield > 0) {
      ctx.globalAlpha = 0.4 + this.shield * 0.4;
      ctx.strokeStyle = "#38e1ff";
      ctx.shadowColor = "#38e1ff";
      ctx.shadowBlur = 16;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    if (!blink) {
      // Engine glow.
      ctx.fillStyle = "rgba(125,249,255,0.7)";
      ctx.shadowColor = "#7df9ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-6, 12);
      ctx.lineTo(6, 12);
      ctx.lineTo(0, 12 + 10 + Math.random() * 6);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Hull.
      const grad = ctx.createLinearGradient(0, -20, 0, 16);
      grad.addColorStop(0, "#e8f7ff");
      grad.addColorStop(1, "#3a8fff");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(14, 12);
      ctx.lineTo(6, 8);
      ctx.lineTo(0, 14);
      ctx.lineTo(-6, 8);
      ctx.lineTo(-14, 12);
      ctx.closePath();
      ctx.fill();

      // Cockpit.
      ctx.fillStyle = "#0a1430";
      ctx.beginPath();
      ctx.ellipse(0, -4, 4, 7, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#7df9ff";
      ctx.beginPath();
      ctx.ellipse(0, -6, 2, 3, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
