// Core game: state machine, spawning, collisions, rendering loop.
import { Input } from "./input.js";
import { Starfield } from "./starfield.js";
import { Player, Enemy, PowerUp, Particle } from "./entities.js";
import { audio } from "./audio.js";
import { circlesHit, rand, randInt, choice, clamp } from "./utils.js";

const STATE = { MENU: "menu", PLAYING: "playing", PAUSED: "paused", OVER: "over" };
const HS_KEY = "star-striker-highscore";

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.input = new Input(canvas);

    this.state = STATE.MENU;
    this.score = 0;
    this.wave = 1;
    this.highScore = Number(localStorage.getItem(HS_KEY) || 0);

    this.player = null;
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];

    this.spawnTimer = 0;
    this.spawnInterval = 1.3;
    this.waveTimer = 0;
    this.waveDuration = 22; // seconds per wave before it ramps up
    this.shake = 0;

    this._resize();
    this.starfield = new Starfield(this.W, this.H);

    window.addEventListener("resize", () => this._resize());
    this.lastTime = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);

    this.ui.setHighScore(this.highScore);
  }

  _resize() {
    // Keep a comfortable portrait-ish play area, capped for large screens.
    const maxW = 540;
    const maxH = 900;
    const W = Math.min(window.innerWidth, maxW);
    const H = Math.min(window.innerHeight, maxH);
    this.W = W;
    this.H = H;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    this.canvas.style.width = W + "px";
    this.canvas.style.height = H + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.starfield) this.starfield.resize(W, H);
  }

  // ---------- State transitions ----------
  start() {
    audio.init();
    audio.resume();
    this.score = 0;
    this.wave = 1;
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1.3;
    this.waveTimer = 0;
    this.player = new Player(this.W, this.H);
    this.player.reset(this.W, this.H);
    this.state = STATE.PLAYING;
    this.ui.showHUD();
    this.ui.hideOverlays();
    this.ui.setScore(0);
    this.ui.setWave(1);
    this.ui.setLives(this.player.lives);
    audio.wave();
  }

  togglePause() {
    if (this.state === STATE.PLAYING) {
      this.state = STATE.PAUSED;
      this.ui.showPause();
    } else if (this.state === STATE.PAUSED) {
      this.resume();
    }
  }

  resume() {
    if (this.state === STATE.PAUSED) {
      this.state = STATE.PLAYING;
      this.ui.hidePause();
      audio.resume();
    }
  }

  gameOver() {
    this.state = STATE.OVER;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(HS_KEY, String(this.highScore));
    }
    this.ui.setHighScore(this.highScore);
    this.ui.showGameOver(this.score, this.wave, this.highScore);
    audio.gameOver();
  }

  // ---------- Spawning ----------
  _spawnEnemy() {
    const x = rand(40, this.W - 40);
    // Difficulty pools widen with the wave number.
    let pool = ["grunt"];
    if (this.wave >= 2) pool.push("diver");
    if (this.wave >= 3) pool.push("shooter", "diver");
    if (this.wave >= 4) pool.push("shooter", "tank");
    if (this.wave >= 6) pool.push("tank", "shooter");
    const type = choice(pool);
    this.enemies.push(new Enemy(type, x, -30));

    // Occasionally spawn a small formation.
    if (this.wave >= 3 && Math.random() < 0.25) {
      const n = randInt(2, 3);
      for (let i = 1; i <= n; i++) {
        const ex = clamp(x + i * 44 - n * 22, 30, this.W - 30);
        this.enemies.push(new Enemy("grunt", ex, -30 - i * 30));
      }
    }
  }

  _emitExplosion(x, y, color, n = 16) {
    for (let i = 0; i < n; i++) this.particles.push(new Particle(x, y, color));
  }

  // ---------- Update ----------
  _update(dt) {
    const speedMul = this.state === STATE.PLAYING ? 1 : 0.25;
    this.starfield.update(dt, speedMul);

    if (this.state !== STATE.PLAYING) return;

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);

    // Wave progression.
    this.waveTimer += dt;
    if (this.waveTimer >= this.waveDuration) {
      this.waveTimer = 0;
      this.wave += 1;
      this.spawnInterval = Math.max(0.45, this.spawnInterval * 0.9);
      this.ui.setWave(this.wave);
      audio.wave();
    }

    // Spawning.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval * rand(0.7, 1.2);
      this._spawnEnemy();
    }

    // Player.
    this.player.update(dt, this.input, this.W, this.H);
    if (this.input.firing) {
      const shots = this.player.tryFire();
      if (shots.length) {
        this.bullets.push(...shots);
        audio.shoot();
      }
    }

    // Bullets.
    for (const b of this.bullets) b.update(dt, this.W, this.H);
    for (const b of this.enemyBullets) b.update(dt, this.W, this.H);

    // Enemies (may fire).
    for (const e of this.enemies) {
      const shot = e.update(dt, this.W, this.H, this.player);
      if (shot) {
        this.enemyBullets.push(shot);
        audio.enemyShoot();
      }
    }

    // Power-ups.
    for (const p of this.powerups) p.update(dt, this.W, this.H);
    for (const pt of this.particles) pt.update(dt);

    this._collisions();

    // Cleanup.
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.enemyBullets = this.enemyBullets.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.powerups = this.powerups.filter((p) => !p.dead);
    this.particles = this.particles.filter((p) => !p.dead);
  }

  _collisions() {
    const p = this.player;

    // Player bullets vs enemies.
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (circlesHit(b, e)) {
          b.dead = true;
          this._emitExplosion(b.x, b.y, e.color, 4);
          const destroyed = e.damage(b.damage);
          audio.hit();
          if (destroyed) {
            this.score += e.score;
            this.ui.setScore(this.score);
            this._emitExplosion(e.x, e.y, e.color, 20);
            audio.explosion();
            this.shake = Math.min(8, this.shake + 3);
            this._maybeDropPowerup(e.x, e.y);
          }
          break;
        }
      }
    }

    // Enemy bullets vs player.
    if (p.invuln <= 0) {
      for (const b of this.enemyBullets) {
        if (b.dead) continue;
        if (circlesHit(b, p)) {
          b.dead = true;
          this._damagePlayer();
          break;
        }
      }
    }

    // Enemies colliding with player.
    if (p.invuln <= 0) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (circlesHit(e, p)) {
          e.dead = true;
          this._emitExplosion(e.x, e.y, e.color, 18);
          this._damagePlayer();
          break;
        }
      }
    }

    // Power-ups vs player.
    for (const pu of this.powerups) {
      if (pu.dead) continue;
      if (circlesHit(pu, p)) {
        pu.dead = true;
        audio.powerup();
        if (pu.kind === "weapon") {
          p.upgrade();
        } else {
          p.lives = Math.min(5, p.lives + 1);
          this.ui.setLives(p.lives);
        }
        this._emitExplosion(pu.x, pu.y, pu.kind === "weapon" ? "#38e1ff" : "#ff4d8d", 14);
      }
    }
  }

  _damagePlayer() {
    const p = this.player;
    p.hit();
    this.ui.setLives(p.lives);
    this._emitExplosion(p.x, p.y, "#38e1ff", 26);
    this.shake = 10;
    audio.playerHit();
    if (p.lives <= 0) this.gameOver();
  }

  _maybeDropPowerup(x, y) {
    const r = Math.random();
    if (r < 0.12) {
      this.powerups.push(new PowerUp(x, y, "weapon"));
    } else if (r < 0.15) {
      this.powerups.push(new PowerUp(x, y, "life"));
    }
  }

  // ---------- Render ----------
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    ctx.save();
    if (this.shake > 0) {
      ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
    }

    this.starfield.draw(ctx);

    if (this.state === STATE.PLAYING || this.state === STATE.PAUSED || this.state === STATE.OVER) {
      for (const pt of this.particles) pt.draw(ctx);
      for (const pu of this.powerups) pu.draw(ctx);
      for (const b of this.bullets) b.draw(ctx);
      for (const b of this.enemyBullets) b.draw(ctx);
      for (const e of this.enemies) e.draw(ctx);
      if (this.player && this.state !== STATE.OVER) this.player.draw(ctx);
    }

    ctx.restore();
  }

  _loop(now) {
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.05; // clamp huge frame gaps (tab switches)

    // Pause / hotkeys handled here so they work without focus issues.
    this._handleHotkeys();

    this._update(dt);
    this._draw();
    requestAnimationFrame(this._loop);
  }

  _handleHotkeys() {
    const i = this.input;
    const pausePressed = i.pressed("p") || i.pressed("escape");
    if (pausePressed && !this._pauseLatch) {
      this._pauseLatch = true;
      if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) this.togglePause();
    } else if (!pausePressed) {
      this._pauseLatch = false;
    }
  }
}
