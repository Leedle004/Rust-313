/* ============================================================
   星际射击 · Star Shooter
   A self-contained HTML5 canvas space shooter (vanilla JS).
   ============================================================ */
(() => {
  "use strict";

  // ---------- Canvas setup ----------
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0;
  function resize() {
    // Use a portrait-ish play area, capped for large screens.
    const maxW = 540;
    const availW = window.innerWidth;
    const availH = window.innerHeight;
    W = Math.min(maxW, availW);
    H = availH;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- Utility ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  };

  // ---------- Audio (Web Audio API, no asset files) ----------
  const Sound = {
    ctx: null,
    muted: false,
    ensure() {
      if (!this.ctx) {
        try {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
          this.ctx = null;
        }
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },
    tone(freq, dur, type = "square", vol = 0.18, slideTo = null) {
      if (this.muted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    },
    noise(dur, vol = 0.25) {
      if (this.muted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.buffer = buf;
      src.connect(gain).connect(this.ctx.destination);
      src.start(t);
    },
    shoot() { this.tone(880, 0.08, "square", 0.06, 420); },
    enemyShoot() { this.tone(300, 0.12, "sawtooth", 0.05, 160); },
    explode() { this.noise(0.3, 0.22); this.tone(140, 0.3, "sawtooth", 0.12, 60); },
    hit() { this.tone(220, 0.1, "triangle", 0.12, 120); },
    powerup() { this.tone(520, 0.1, "sine", 0.18, 990); this.tone(990, 0.12, "sine", 0.12); },
    wave() { this.tone(440, 0.18, "sine", 0.16, 660); },
    gameover() { this.tone(440, 0.5, "sawtooth", 0.18, 80); },
  };

  // ---------- Input ----------
  const keys = {};
  const pointer = { x: W / 2, y: H * 0.8, active: false };

  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (e.code === "KeyP" || e.code === "Escape") togglePause();
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  function pointerMove(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = clientX - rect.left;
    pointer.y = clientY - rect.top;
  }
  canvas.addEventListener("mousemove", (e) => { pointer.active = true; pointerMove(e.clientX, e.clientY); });
  canvas.addEventListener("touchstart", (e) => { pointer.active = true; pointerMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  canvas.addEventListener("touchmove", (e) => { pointerMove(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, { passive: false });

  // ---------- Starfield background ----------
  const stars = [];
  function initStars() {
    stars.length = 0;
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: rand(0.3, 1),
      });
    }
  }
  initStars();
  function updateStars(dt) {
    for (const s of stars) {
      s.y += (30 + s.z * 90) * dt;
      if (s.y > H) { s.y = -2; s.x = Math.random() * W; s.z = rand(0.3, 1); }
    }
  }
  function drawStars() {
    for (const s of stars) {
      ctx.globalAlpha = 0.3 + s.z * 0.7;
      ctx.fillStyle = s.z > 0.8 ? "#9fdcff" : "#ffffff";
      const size = s.z * 2;
      ctx.fillRect(s.x, s.y, size, size);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Entities ----------
  const bullets = [];      // player bullets
  const enemyBullets = []; // enemy bullets
  const enemies = [];
  const particles = [];
  const powerups = [];

  function spawnParticles(x, y, color, count = 14, speed = 220) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(speed * 0.3, speed);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.3, 0.7),
        maxLife: 0.7,
        color,
        size: rand(2, 4),
      });
    }
  }

  // ---------- Player ----------
  const player = {
    x: W / 2,
    y: H * 0.8,
    r: 16,
    speed: 360,
    maxHealth: 100,
    health: 100,
    lives: 3,
    cooldown: 0,
    fireRate: 0.22,
    weapon: "single", // single | spread
    rapidTimer: 0,
    shieldTimer: 0,
    invuln: 0,
    reset() {
      this.x = W / 2;
      this.y = H * 0.8;
      this.health = this.maxHealth;
      this.lives = 3;
      this.cooldown = 0;
      this.weapon = "single";
      this.rapidTimer = 0;
      this.shieldTimer = 0;
      this.invuln = 1.2;
    },
  };

  function fireBullet() {
    Sound.shoot();
    const baseY = player.y - player.r - 4;
    const make = (vx, vy) => bullets.push({ x: player.x, y: baseY, vx, vy, r: 4, dmg: 12 });
    if (player.weapon === "spread") {
      make(-150, -640);
      make(0, -680);
      make(150, -640);
    } else {
      make(0, -700);
    }
  }

  // ---------- Enemy factory ----------
  function makeEnemy(type, x, y) {
    const base = { x, y, vx: 0, vy: 0, t: 0, fireTimer: rand(0.5, 2), type };
    switch (type) {
      case "grunt":
        return { ...base, r: 16, health: 24, maxHealth: 24, score: 100, color: "#ff7a7a", vy: 70, canShoot: false };
      case "zigzag":
        return { ...base, r: 15, health: 30, maxHealth: 30, score: 150, color: "#ffd166", vy: 60, amp: rand(60, 130), freq: rand(1.5, 3), baseX: x, canShoot: false };
      case "shooter":
        return { ...base, r: 18, health: 44, maxHealth: 44, score: 250, color: "#c98bff", vy: 45, canShoot: true, fireEvery: rand(1.6, 2.6) };
      case "tank":
        return { ...base, r: 26, health: 120, maxHealth: 120, score: 500, color: "#7ad7ff", vy: 28, canShoot: true, fireEvery: rand(1.4, 2.0) };
      case "boss":
        return { ...base, r: 56, health: 1400, maxHealth: 1400, score: 5000, color: "#ff4fa3", vy: 18, canShoot: true, fireEvery: 0.9, boss: true, baseX: W / 2, amp: W * 0.32, freq: 0.5 };
      default:
        return { ...base, r: 16, health: 20, maxHealth: 20, score: 100, color: "#ff7a7a", vy: 70 };
    }
  }

  function enemyFire(e) {
    Sound.enemyShoot();
    if (e.boss) {
      // fan shot
      for (let i = -2; i <= 2; i++) {
        const a = Math.PI / 2 + i * 0.28;
        enemyBullets.push({ x: e.x, y: e.y + e.r, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 6, dmg: 18 });
      }
    } else {
      // aim at player
      const dx = player.x - e.x, dy = player.y - e.y;
      const len = Math.hypot(dx, dy) || 1;
      const sp = 280;
      enemyBullets.push({ x: e.x, y: e.y + e.r, vx: (dx / len) * sp, vy: (dy / len) * sp, r: 5, dmg: 14 });
    }
  }

  function dropPowerup(x, y) {
    // 22% chance to drop a power-up.
    if (Math.random() > 0.22) return;
    const types = ["health", "spread", "rapid", "shield"];
    const type = types[randInt(0, types.length - 1)];
    powerups.push({ x, y, vy: 90, r: 13, type, t: 0 });
  }

  const POWERUP_STYLE = {
    health: { color: "#5dff8f", glyph: "+" },
    spread: { color: "#44e0ff", glyph: "W" },
    rapid:  { color: "#ffb347", glyph: "R" },
    shield: { color: "#c98bff", glyph: "O" },
  };

  // ---------- Wave / spawning ----------
  const game = {
    state: "menu", // menu | playing | paused | over
    score: 0,
    wave: 0,
    spawnQueue: [],
    spawnTimer: 0,
    bossActive: false,
    highScore: Number(localStorage.getItem("starshooter_high") || 0),
  };

  function startWave(n) {
    game.wave = n;
    document.getElementById("wave").textContent = n;
    Sound.wave();
    game.spawnQueue = [];

    if (n % 5 === 0) {
      // Boss wave
      game.spawnQueue.push({ type: "boss", delay: 0.6 });
      game.bossActive = true;
    } else {
      const count = 6 + n * 2;
      for (let i = 0; i < count; i++) {
        let type = "grunt";
        const roll = Math.random();
        if (n >= 2 && roll < 0.25) type = "zigzag";
        if (n >= 3 && roll >= 0.25 && roll < 0.45) type = "shooter";
        if (n >= 4 && roll >= 0.45 && roll < 0.55) type = "tank";
        game.spawnQueue.push({ type, delay: rand(0.4, 1.1) });
      }
    }
    game.spawnTimer = 0.5;
  }

  function processSpawns(dt) {
    if (game.spawnQueue.length === 0) return;
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      const next = game.spawnQueue.shift();
      const x = next.type === "boss" ? W / 2 : rand(40, W - 40);
      const y = next.type === "boss" ? -70 : rand(-120, -40);
      enemies.push(makeEnemy(next.type, x, y));
      game.spawnTimer = game.spawnQueue.length ? game.spawnQueue[0].delay : 0;
    }
  }

  // ---------- Damage / death ----------
  function damagePlayer(amount) {
    if (player.invuln > 0 || player.shieldTimer > 0) {
      if (player.shieldTimer > 0) {
        spawnParticles(player.x, player.y, "#c98bff", 8, 160);
      }
      return;
    }
    player.health -= amount;
    Sound.hit();
    player.invuln = 0.6;
    spawnParticles(player.x, player.y, "#ff5566", 10, 180);
    if (player.health <= 0) {
      player.lives--;
      Sound.explode();
      spawnParticles(player.x, player.y, "#ffaa44", 40, 320);
      if (player.lives <= 0) {
        endGame();
      } else {
        player.health = player.maxHealth;
        player.invuln = 1.6;
        player.weapon = "single";
      }
    }
    updateHud();
  }

  function killEnemy(e, idx) {
    game.score += e.score;
    spawnParticles(e.x, e.y, e.color, e.boss ? 80 : 22, e.boss ? 420 : 260);
    Sound.explode();
    dropPowerup(e.x, e.y);
    enemies.splice(idx, 1);
    if (e.boss) {
      game.bossActive = false;
      // big reward shower
      for (let i = 0; i < 3; i++) powerups.push({ x: e.x + rand(-40, 40), y: e.y, vy: 80, r: 13, type: ["health", "spread", "rapid", "shield"][randInt(0, 3)], t: 0 });
    }
    updateHud();
  }

  // ---------- Update loop ----------
  function update(dt) {
    updateStars(dt);
    if (game.state !== "playing") return;

    // Player movement
    let mvx = 0, mvy = 0;
    if (keys["ArrowLeft"] || keys["KeyA"]) mvx -= 1;
    if (keys["ArrowRight"] || keys["KeyD"]) mvx += 1;
    if (keys["ArrowUp"] || keys["KeyW"]) mvy -= 1;
    if (keys["ArrowDown"] || keys["KeyS"]) mvy += 1;

    if (mvx || mvy) {
      const len = Math.hypot(mvx, mvy) || 1;
      player.x += (mvx / len) * player.speed * dt;
      player.y += (mvy / len) * player.speed * dt;
    } else if (pointer.active) {
      // Smoothly follow pointer
      player.x += (pointer.x - player.x) * Math.min(1, dt * 12);
      player.y += (pointer.y - player.y) * Math.min(1, dt * 12);
    }
    player.x = clamp(player.x, player.r, W - player.r);
    player.y = clamp(player.y, player.r, H - player.r);

    // Timers
    player.invuln = Math.max(0, player.invuln - dt);
    if (player.rapidTimer > 0) { player.rapidTimer -= dt; if (player.rapidTimer <= 0) player.fireRate = 0.22; }
    if (player.shieldTimer > 0) player.shieldTimer -= dt;

    // Shooting (auto-fire; space boosts rate)
    player.cooldown -= dt;
    const rate = (keys["Space"] ? player.fireRate * 0.6 : player.fireRate);
    if (player.cooldown <= 0) {
      fireBullet();
      player.cooldown = rate;
    }

    // Player bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -20 || b.x < -20 || b.x > W + 20) bullets.splice(i, 1);
    }

    // Enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y > H + 20 || b.y < -20 || b.x < -20 || b.x > W + 20) {
        enemyBullets.splice(i, 1);
        continue;
      }
      if (dist2(b.x, b.y, player.x, player.y) < (b.r + player.r) * (b.r + player.r)) {
        damagePlayer(b.dmg);
        enemyBullets.splice(i, 1);
      }
    }

    // Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.t += dt;
      e.y += e.vy * dt;

      if (e.type === "zigzag") {
        e.x = e.baseX + Math.sin(e.t * e.freq) * e.amp;
      } else if (e.boss) {
        e.x = e.baseX + Math.sin(e.t * e.freq) * e.amp;
        if (e.y < 110) e.y += e.vy * dt; // descend then hold
        else e.y = 110;
      }
      e.x = clamp(e.x, e.r, W - e.r);

      // Firing
      if (e.canShoot) {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && e.y > 0) {
          enemyFire(e);
          e.fireTimer = e.fireEvery;
        }
      }

      // Off bottom -> escapes (costs player a little health, removes)
      if (e.y > H + e.r) {
        enemies.splice(i, 1);
        if (!e.boss) damagePlayer(8);
        continue;
      }

      // Collision with player (ramming)
      if (dist2(e.x, e.y, player.x, player.y) < (e.r + player.r) * (e.r + player.r)) {
        damagePlayer(e.boss ? 30 : 22);
        if (!e.boss) {
          e.health -= 40;
          if (e.health <= 0) { killEnemy(e, i); continue; }
        }
      }

      // Player bullets vs this enemy
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (dist2(b.x, b.y, e.x, e.y) < (b.r + e.r) * (b.r + e.r)) {
          e.health -= b.dmg;
          spawnParticles(b.x, b.y, "#ffffff", 4, 120);
          bullets.splice(j, 1);
          if (e.health <= 0) { killEnemy(e, i); break; }
        }
      }
    }

    // Power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.t += dt;
      p.y += p.vy * dt;
      if (p.y > H + 20) { powerups.splice(i, 1); continue; }
      if (dist2(p.x, p.y, player.x, player.y) < (p.r + player.r) * (p.r + player.r)) {
        applyPowerup(p.type);
        spawnParticles(p.x, p.y, POWERUP_STYLE[p.type].color, 16, 220);
        Sound.powerup();
        powerups.splice(i, 1);
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }

    // Wave progression
    processSpawns(dt);
    if (game.spawnQueue.length === 0 && enemies.length === 0 && !game.bossActive) {
      startWave(game.wave + 1);
    }

    updateHud();
  }

  function applyPowerup(type) {
    switch (type) {
      case "health":
        player.health = Math.min(player.maxHealth, player.health + 35);
        break;
      case "spread":
        player.weapon = "spread";
        break;
      case "rapid":
        player.fireRate = 0.1;
        player.rapidTimer = 8;
        break;
      case "shield":
        player.shieldTimer = 7;
        break;
    }
    updateHud();
  }

  // ---------- Rendering ----------
  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);

    // Shield ring
    if (player.shieldTimer > 0) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(201,139,255,${0.5 + 0.3 * Math.sin(performance.now() / 120)})`;
      ctx.lineWidth = 3;
      ctx.arc(0, 0, player.r + 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Blink when invulnerable
    if (player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Engine flame
    const flame = 8 + Math.random() * 6;
    ctx.beginPath();
    ctx.moveTo(-6, player.r - 2);
    ctx.lineTo(0, player.r - 2 + flame);
    ctx.lineTo(6, player.r - 2);
    ctx.fillStyle = "#ffb347";
    ctx.fill();

    // Ship body
    ctx.beginPath();
    ctx.moveTo(0, -player.r);
    ctx.lineTo(player.r * 0.85, player.r * 0.8);
    ctx.lineTo(0, player.r * 0.45);
    ctx.lineTo(-player.r * 0.85, player.r * 0.8);
    ctx.closePath();
    const grd = ctx.createLinearGradient(0, -player.r, 0, player.r);
    grd.addColorStop(0, "#9fefff");
    grd.addColorStop(1, "#2aa7ff");
    ctx.fillStyle = grd;
    ctx.shadowColor = "#44e0ff";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cockpit
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 12;

    if (e.boss) {
      ctx.beginPath();
      ctx.fillStyle = e.color;
      ctx.moveTo(0, e.r);
      ctx.lineTo(e.r, -e.r * 0.4);
      ctx.lineTo(e.r * 0.5, -e.r);
      ctx.lineTo(-e.r * 0.5, -e.r);
      ctx.lineTo(-e.r, -e.r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "#fff";
      ctx.arc(0, -e.r * 0.3, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // inverted ship shape
      ctx.beginPath();
      ctx.moveTo(0, e.r);
      ctx.lineTo(e.r * 0.85, -e.r * 0.8);
      ctx.lineTo(0, -e.r * 0.4);
      ctx.lineTo(-e.r * 0.85, -e.r * 0.8);
      ctx.closePath();
      ctx.fillStyle = e.color;
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.arc(0, e.r * 0.1, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // Health bar for tougher enemies
    if (e.health < e.maxHealth && (e.maxHealth > 40 || e.boss)) {
      const bw = e.boss ? W * 0.6 : e.r * 2;
      const bx = e.boss ? (W - bw) / 2 : e.x - e.r;
      const by = e.boss ? 18 : e.y - e.r - 8;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bx, by, bw, e.boss ? 8 : 4);
      ctx.fillStyle = e.boss ? "#ff4fa3" : "#ff7a7a";
      ctx.fillRect(bx, by, bw * (e.health / e.maxHealth), e.boss ? 8 : 4);
    }
  }

  function drawPowerup(p) {
    const style = POWERUP_STYLE[p.type];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.sin(p.t * 2) * 0.3);
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = style.color;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-p.r, -p.r, p.r * 2, p.r * 2, 5) : ctx.rect(-p.r, -p.r, p.r * 2, p.r * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#05060f";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(style.glyph, 0, 1);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawStars();

    // Power-ups
    for (const p of powerups) drawPowerup(p);

    // Player bullets
    for (const b of bullets) {
      ctx.fillStyle = "#9fefff";
      ctx.shadowColor = "#44e0ff";
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x - b.r / 2, b.y - b.r * 2, b.r, b.r * 4);
      ctx.shadowBlur = 0;
    }

    // Enemy bullets
    for (const b of enemyBullets) {
      ctx.beginPath();
      ctx.fillStyle = "#ff8a5c";
      ctx.shadowColor = "#ff5566";
      ctx.shadowBlur = 8;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Enemies
    for (const e of enemies) drawEnemy(e);

    // Particles
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Player
    if (game.state === "playing" || game.state === "paused") drawPlayer();
  }

  // ---------- HUD ----------
  const el = {
    score: document.getElementById("score"),
    high: document.getElementById("high-score"),
    lives: document.getElementById("lives"),
    wave: document.getElementById("wave"),
    health: document.getElementById("health-bar"),
  };
  function updateHud() {
    el.score.textContent = game.score;
    el.high.textContent = Math.max(game.highScore, game.score);
    el.lives.textContent = player.lives;
    const pct = clamp(player.health / player.maxHealth, 0, 1) * 100;
    el.health.style.width = pct + "%";
    el.health.style.background = pct > 50
      ? "linear-gradient(90deg,#5dff8f,#44e0ff)"
      : pct > 25
        ? "linear-gradient(90deg,#ffb347,#ffd166)"
        : "linear-gradient(90deg,#ff5566,#ff8a5c)";
  }

  // ---------- Game state control ----------
  function startGame() {
    Sound.ensure();
    bullets.length = 0;
    enemyBullets.length = 0;
    enemies.length = 0;
    particles.length = 0;
    powerups.length = 0;
    game.score = 0;
    game.bossActive = false;
    player.reset();
    game.state = "playing";
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("gameover-screen").classList.add("hidden");
    document.getElementById("pause-screen").classList.add("hidden");
    document.getElementById("hud").classList.remove("hidden");
    startWave(1);
    updateHud();
  }

  function togglePause() {
    if (game.state === "playing") {
      game.state = "paused";
      document.getElementById("pause-screen").classList.remove("hidden");
    } else if (game.state === "paused") {
      game.state = "playing";
      document.getElementById("pause-screen").classList.add("hidden");
    }
  }

  function goToMenu() {
    game.state = "menu";
    document.getElementById("pause-screen").classList.add("hidden");
    document.getElementById("gameover-screen").classList.add("hidden");
    document.getElementById("hud").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");
  }

  function endGame() {
    game.state = "over";
    Sound.gameover();
    const isRecord = game.score > game.highScore;
    if (isRecord) {
      game.highScore = game.score;
      localStorage.setItem("starshooter_high", String(game.highScore));
    }
    document.getElementById("final-score").textContent = game.score;
    document.getElementById("final-wave").textContent = game.wave;
    document.getElementById("final-high").textContent = game.highScore;
    document.getElementById("new-record").classList.toggle("hidden", !isRecord);
    document.getElementById("hud").classList.add("hidden");
    document.getElementById("gameover-screen").classList.remove("hidden");
  }

  // ---------- Buttons ----------
  document.getElementById("start-btn").addEventListener("click", startGame);
  document.getElementById("restart-btn").addEventListener("click", startGame);
  document.getElementById("resume-btn").addEventListener("click", togglePause);
  document.getElementById("quit-btn").addEventListener("click", goToMenu);
  document.getElementById("menu-btn").addEventListener("click", goToMenu);

  const muteBtn = document.getElementById("mute-btn");
  muteBtn.addEventListener("click", () => {
    Sound.muted = !Sound.muted;
    muteBtn.textContent = Sound.muted ? "🔇" : "🔊";
  });

  // Init high score display
  document.getElementById("high-score").textContent = game.highScore;

  // ---------- Main loop ----------
  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.05); // clamp to avoid spiral on tab switch
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
