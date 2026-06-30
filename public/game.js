const TARGET_ASSET_BYTES = 20_000_000;
const ASSET_URL = "./assets/starfall-20mb.pack";

const canvas = document.querySelector("#game");
const overlay = document.querySelector("#overlay");
const loadingLabel = document.querySelector("#loading-label");
const loadingBar = document.querySelector("#loading-bar");
const startButton = document.querySelector("#start-button");
const hud = {
  score: document.querySelector("#score"),
  shield: document.querySelector("#shield"),
  cargo: document.querySelector("#cargo"),
  best: document.querySelector("#best")
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (start, end, amount) => start + (end - start) * amount;
const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

class Rng {
  constructor(seed) {
    this.state = seed >>> 0 || 0x6d2b79f5;
  }

  next() {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  float() {
    return this.next() / 0xffffffff;
  }

  range(min, max) {
    return min + (max - min) * this.float();
  }

  pick(items) {
    return items[Math.floor(this.float() * items.length) % items.length];
  }
}

class AssetPack {
  constructor(bytes) {
    this.bytes = bytes;
    this.size = bytes.length;
    this.seed = this.computeSeed(bytes);
    this.rng = new Rng(this.seed);
    this.palette = this.createPalette();
  }

  static async load(onProgress) {
    try {
      const response = await fetch(ASSET_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const total = Number(response.headers.get("content-length")) || TARGET_ASSET_BYTES;
      if (!response.body) {
        const buffer = await response.arrayBuffer();
        onProgress(1);
        return new AssetPack(new Uint8Array(buffer));
      }

      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        chunks.push(value);
        received += value.length;
        onProgress(clamp(received / total, 0, 0.99));
      }

      const bytes = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      onProgress(1);
      return new AssetPack(bytes);
    } catch (error) {
      console.warn("Using procedural fallback asset pack:", error);
      const bytes = new Uint8Array(1024);
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = (index * 73 + 41) & 255;
      }
      onProgress(1);
      return new AssetPack(bytes);
    }
  }

  computeSeed(bytes) {
    let hash = 0x811c9dc5;
    const stride = Math.max(1, Math.floor(bytes.length / 8192));
    for (let index = 0; index < bytes.length; index += stride) {
      hash ^= bytes[index];
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash || 0x9e3779b9;
  }

  sample(index) {
    return this.bytes[index % this.bytes.length];
  }

  createPalette() {
    const hue = this.sample(128) + this.sample(4096);
    return {
      cyan: `hsl(${(hue + 168) % 360} 95% 70%)`,
      blue: `hsl(${(hue + 210) % 360} 92% 62%)`,
      amber: `hsl(${(hue + 22) % 360} 100% 68%)`,
      violet: `hsl(${(hue + 286) % 360} 86% 70%)`,
      red: `hsl(${(hue + 348) % 360} 96% 66%)`
    };
  }
}

class StarfallGame {
  constructor(canvasElement, pack) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    this.pack = pack;
    this.rng = new Rng(pack.seed ^ 0xa511e9b3);
    this.width = 1280;
    this.height = 720;
    this.keys = new Set();
    this.pointer = { x: 900, y: 360, active: false };
    this.player = this.createPlayer();
    this.bullets = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.stars = [];
    this.score = 0;
    this.best = Number(localStorage.getItem("starfall-20mb-best") || 0);
    this.elapsed = 0;
    this.fireTimer = 0;
    this.spawnTimer = 0.8;
    this.pickupTimer = 2.5;
    this.state = "ready";
    this.lastTime = 0;

    this.bindEvents();
    this.resize();
    this.createStars();
    this.updateHud();
    requestAnimationFrame((time) => this.frame(time));
  }

  createPlayer() {
    return {
      x: 180,
      y: 360,
      radius: 18,
      shield: 100,
      cargo: 0,
      dashCooldown: 0,
      dashTime: 0,
      invulnerable: 0
    };
  }

  bindEvents() {
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Space"].includes(event.key)) {
        event.preventDefault();
      }
      if (event.key.toLowerCase() === "p" && this.state === "running") {
        this.state = "paused";
        this.showOverlay("已暂停，按 P 继续", "继续护航", false);
      } else if (event.key.toLowerCase() === "p" && this.state === "paused") {
        this.resume();
      } else if (event.key === " " || event.code === "Space") {
        this.tryDash();
      }
      this.keys.add(event.key.toLowerCase());
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    this.canvas.addEventListener("pointermove", (event) => this.updatePointer(event));
    this.canvas.addEventListener("pointerdown", (event) => {
      this.updatePointer(event);
      this.pointer.active = true;
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("pointerup", (event) => {
      this.pointer.active = false;
      this.canvas.releasePointerCapture(event.pointerId);
    });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    this.width = rect.width || 1280;
    this.height = rect.height || 720;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  updatePointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = event.clientX - rect.left;
    this.pointer.y = event.clientY - rect.top;
  }

  createStars() {
    this.stars = [];
    const count = 280;
    for (let index = 0; index < count; index += 1) {
      const byte = this.pack.sample(index * 997);
      this.stars.push({
        x: this.rng.range(0, this.width),
        y: this.rng.range(0, this.height),
        z: this.rng.range(0.25, 1.6),
        size: this.rng.range(0.7, 2.6),
        color: byte % 5 === 0 ? this.pack.palette.amber : this.pack.palette.cyan
      });
    }
  }

  start() {
    this.player = this.createPlayer();
    this.bullets = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.score = 0;
    this.elapsed = 0;
    this.fireTimer = 0;
    this.spawnTimer = 0.6;
    this.pickupTimer = 1.5;
    this.state = "running";
    overlay.classList.add("hidden");
    this.updateHud();
  }

  resume() {
    this.state = "running";
    overlay.classList.add("hidden");
  }

  showOverlay(message, buttonText, disabled) {
    loadingLabel.textContent = message;
    startButton.textContent = buttonText;
    startButton.disabled = disabled;
    loadingBar.style.width = disabled ? "0%" : "100%";
    overlay.classList.remove("hidden");
  }

  tryDash() {
    if (this.state !== "running" || this.player.dashCooldown > 0) {
      return;
    }
    this.player.dashTime = 0.18;
    this.player.dashCooldown = 2.1;
    this.player.invulnerable = 0.34;
    this.burst(this.player.x, this.player.y, this.pack.palette.blue, 20, 230);
  }

  frame(time) {
    const dt = Math.min(0.033, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;
    if (this.state === "running") {
      this.update(dt);
    }
    this.draw();
    requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  update(dt) {
    this.elapsed += dt;
    this.score += dt * 12 + this.player.cargo * dt * 2;
    this.updatePlayer(dt);
    this.updateStars(dt);
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.handleSpawns(dt);
    this.handleCollisions();
    this.updateHud();

    if (this.player.shield <= 0) {
      this.gameOver();
    }
  }

  updatePlayer(dt) {
    const left = this.keys.has("a") || this.keys.has("arrowleft");
    const right = this.keys.has("d") || this.keys.has("arrowright");
    const up = this.keys.has("w") || this.keys.has("arrowup");
    const down = this.keys.has("s") || this.keys.has("arrowdown");
    let dx = Number(right) - Number(left);
    let dy = Number(down) - Number(up);
    const length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;

    const dashMultiplier = this.player.dashTime > 0 ? 2.9 : 1;
    const speed = 280 * dashMultiplier;
    this.player.x = clamp(this.player.x + dx * speed * dt, 28, this.width - 28);
    this.player.y = clamp(this.player.y + dy * speed * dt, 28, this.height - 28);
    this.player.dashTime = Math.max(0, this.player.dashTime - dt);
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = Math.max(0.12, 0.22 - this.player.cargo * 0.006);
      this.fireBullet();
    }
  }

  updateStars(dt) {
    for (const star of this.stars) {
      star.x -= (28 + star.z * 44) * dt;
      if (star.x < -10) {
        star.x = this.width + 10;
        star.y = this.rng.range(0, this.height);
      }
    }
  }

  updateBullets(dt) {
    this.bullets = this.bullets.filter((bullet) => {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      return bullet.life > 0 && bullet.x < this.width + 80 && bullet.x > -80 && bullet.y > -80 && bullet.y < this.height + 80;
    });
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      const wobble = Math.sin(this.elapsed * enemy.wobbleSpeed + enemy.phase) * enemy.wobble;
      enemy.x += enemy.vx * dt;
      enemy.y += (enemy.vy + wobble) * dt;
      enemy.spin += dt * enemy.spinSpeed;
    }
    this.enemies = this.enemies.filter((enemy) => enemy.x > -80 && enemy.y > -90 && enemy.y < this.height + 90 && enemy.hp > 0);
  }

  updatePickups(dt) {
    this.pickups = this.pickups.filter((pickup) => {
      pickup.x -= pickup.speed * dt;
      pickup.pulse += dt;
      return pickup.x > -40;
    });
  }

  updateParticles(dt) {
    this.particles = this.particles.filter((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      particle.life -= dt;
      return particle.life > 0;
    });
  }

  handleSpawns(dt) {
    this.spawnTimer -= dt;
    this.pickupTimer -= dt;
    const pressure = clamp(this.elapsed / 90, 0, 0.72);

    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.rng.range(0.28, 0.88 - pressure * 0.38);
      this.spawnEnemy();
    }

    if (this.pickupTimer <= 0) {
      this.pickupTimer = this.rng.range(4.0, 7.2);
      this.spawnPickup(this.width + 24, this.rng.range(60, this.height - 60), "shield");
    }
  }

  fireBullet() {
    const angle = Math.atan2(this.pointer.y - this.player.y, this.pointer.x - this.player.x);
    const speed = 760;
    this.bullets.push({
      x: this.player.x + Math.cos(angle) * 18,
      y: this.player.y + Math.sin(angle) * 18,
      vx: Math.cos(angle) * speed + 80,
      vy: Math.sin(angle) * speed,
      radius: 4,
      life: 0.9
    });
  }

  spawnEnemy() {
    const typeRoll = this.pack.sample(Math.floor(this.elapsed * 512) + this.enemies.length * 131);
    const heavy = typeRoll > 218;
    const hunter = typeRoll > 150 && typeRoll <= 218;
    const y = this.rng.range(40, this.height - 40);
    this.enemies.push({
      x: this.width + this.rng.range(20, 80),
      y,
      vx: heavy ? this.rng.range(-145, -95) : this.rng.range(-270, -165),
      vy: hunter ? Math.sign(this.player.y - y) * this.rng.range(30, 90) : this.rng.range(-28, 28),
      radius: heavy ? 25 : hunter ? 19 : 15,
      hp: heavy ? 5 : hunter ? 3 : 2,
      score: heavy ? 90 : hunter ? 55 : 30,
      wobble: this.rng.range(12, 52),
      wobbleSpeed: this.rng.range(2.5, 5.0),
      phase: this.rng.range(0, Math.PI * 2),
      spin: 0,
      spinSpeed: this.rng.range(-5, 5),
      color: heavy ? this.pack.palette.violet : hunter ? this.pack.palette.red : this.pack.palette.amber
    });
  }

  spawnPickup(x, y, kind = "cargo") {
    this.pickups.push({
      x,
      y,
      kind,
      radius: kind === "shield" ? 14 : 11,
      speed: kind === "shield" ? 115 : 145,
      pulse: this.rng.range(0, Math.PI * 2)
    });
  }

  handleCollisions() {
    for (const bullet of this.bullets) {
      if (bullet.dead) {
        continue;
      }
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || distance(bullet.x, bullet.y, enemy.x, enemy.y) > bullet.radius + enemy.radius) {
          continue;
        }
        bullet.dead = true;
        enemy.hp -= 1;
        this.burst(bullet.x, bullet.y, enemy.color, 8, 130);
        if (enemy.hp <= 0) {
          this.score += enemy.score;
          this.burst(enemy.x, enemy.y, enemy.color, 24, 220);
          if (this.rng.float() > 0.45) {
            this.spawnPickup(enemy.x, enemy.y);
          }
        }
        break;
      }
    }
    this.bullets = this.bullets.filter((bullet) => !bullet.dead);

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 || distance(this.player.x, this.player.y, enemy.x, enemy.y) > this.player.radius + enemy.radius) {
        continue;
      }
      enemy.hp = 0;
      this.burst(enemy.x, enemy.y, enemy.color, 26, 260);
      if (this.player.invulnerable <= 0) {
        this.player.shield -= enemy.radius * 1.8;
        this.player.invulnerable = 0.62;
      }
    }

    for (const pickup of this.pickups) {
      if (pickup.collected || distance(this.player.x, this.player.y, pickup.x, pickup.y) > this.player.radius + pickup.radius) {
        continue;
      }
      pickup.collected = true;
      if (pickup.kind === "shield") {
        this.player.shield = clamp(this.player.shield + 18, 0, 100);
        this.score += 40;
        this.burst(pickup.x, pickup.y, this.pack.palette.cyan, 14, 150);
      } else {
        this.player.cargo += 1;
        this.score += 120;
        this.burst(pickup.x, pickup.y, this.pack.palette.amber, 16, 170);
      }
    }
    this.pickups = this.pickups.filter((pickup) => !pickup.collected);
  }

  burst(x, y, color, amount, speed) {
    for (let index = 0; index < amount; index += 1) {
      const angle = this.rng.range(0, Math.PI * 2);
      const velocity = this.rng.range(speed * 0.25, speed);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        radius: this.rng.range(1.2, 4.4),
        life: this.rng.range(0.28, 0.85),
        color
      });
    }
  }

  gameOver() {
    this.state = "gameover";
    this.best = Math.max(this.best, Math.floor(this.score));
    localStorage.setItem("starfall-20mb-best", String(this.best));
    this.updateHud();
    this.showOverlay(`护航结束：${Math.floor(this.score)} 分，回收 ${this.player.cargo} 个晶体`, "重新开始", false);
  }

  updateHud() {
    hud.score.textContent = String(Math.floor(this.score));
    hud.shield.textContent = String(Math.max(0, Math.ceil(this.player.shield)));
    hud.cargo.textContent = String(this.player.cargo);
    hud.best.textContent = String(this.best);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground(ctx);
    this.drawPickups(ctx);
    this.drawBullets(ctx);
    this.drawEnemies(ctx);
    this.drawPlayer(ctx);
    this.drawParticles(ctx);
    if (this.state === "paused") {
      this.drawCenterText(ctx, "PAUSED");
    }
  }

  drawBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "#041527");
    gradient.addColorStop(0.52, "#07111f");
    gradient.addColorStop(1, "#120817");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = this.pack.palette.blue;
    ctx.beginPath();
    ctx.ellipse(this.width * 0.72, this.height * 0.18, this.width * 0.28, this.height * 0.16, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = this.pack.palette.red;
    ctx.beginPath();
    ctx.ellipse(this.width * 0.28, this.height * 0.82, this.width * 0.22, this.height * 0.18, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (const star of this.stars) {
      ctx.globalAlpha = clamp(star.z, 0.25, 1);
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * star.z, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawPlayer(ctx) {
    const angle = Math.atan2(this.pointer.y - this.player.y, this.pointer.x - this.player.x);
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(angle);
    ctx.shadowColor = this.pack.palette.cyan;
    ctx.shadowBlur = 18;
    ctx.fillStyle = this.player.invulnerable > 0 ? "#ffffff" : this.pack.palette.cyan;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(-16, -15);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-16, 15);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(-24, -5, 12, 10);
    ctx.restore();
  }

  drawBullets(ctx) {
    ctx.fillStyle = this.pack.palette.cyan;
    ctx.shadowColor = this.pack.palette.cyan;
    ctx.shadowBlur = 12;
    for (const bullet of this.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  drawEnemies(ctx) {
    for (const enemy of this.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.spin);
      ctx.strokeStyle = enemy.color;
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 2;
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let point = 0; point < 6; point += 1) {
        const angle = (Math.PI * 2 * point) / 6;
        const radius = point % 2 === 0 ? enemy.radius : enemy.radius * 0.58;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (point === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawPickups(ctx) {
    for (const pickup of this.pickups) {
      const pulse = Math.sin(pickup.pulse * 6) * 2;
      ctx.save();
      ctx.translate(pickup.x, pickup.y);
      ctx.rotate(pickup.pulse);
      ctx.fillStyle = pickup.kind === "shield" ? this.pack.palette.cyan : this.pack.palette.amber;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(0, -pickup.radius - pulse);
      ctx.lineTo(pickup.radius + pulse, 0);
      ctx.lineTo(0, pickup.radius + pulse);
      ctx.lineTo(-pickup.radius - pulse, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      ctx.globalAlpha = clamp(particle.life, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawCenterText(ctx, text) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.36)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 46px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, this.width / 2, this.height / 2);
    ctx.restore();
  }
}

loadingBar.style.width = "1%";
AssetPack.load((progress) => {
  loadingBar.style.width = `${Math.round(progress * 100)}%`;
  loadingLabel.textContent = `正在载入 20MB 星图资源... ${Math.round(progress * 100)}%`;
}).then((pack) => {
  const mb = (pack.size / 1_000_000).toFixed(2);
  const game = new StarfallGame(canvas, pack);
  loadingLabel.textContent =
    pack.size === TARGET_ASSET_BYTES
      ? `资源包已载入：${mb} MB，种子 #${pack.seed.toString(16)}`
      : `已载入备用资源：${mb} MB，运行 npm run assets 可生成 20MB 包`;
  startButton.textContent = "开始护航";
  startButton.disabled = false;
  loadingBar.style.width = "100%";
  startButton.addEventListener("click", () => {
    if (game.state === "paused") {
      game.resume();
    } else {
      game.start();
    }
  });
});
