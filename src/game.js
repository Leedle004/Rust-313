import { Input } from "./input.js";
import { AudioManager } from "./audio.js";
import { Starfield } from "./entities/starfield.js";
import { Player } from "./entities/player.js";
import { Enemy, Boss, ENEMY_TYPES } from "./entities/enemy.js";
import { Bullet } from "./entities/bullet.js";
import { PowerUp, POWERUP_TYPES } from "./entities/powerup.js";
import { explode } from "./entities/particle.js";
import { circleHit, clamp, rand, choice, randInt } from "./utils.js";

const STATE = { MENU: "menu", PLAYING: "playing", PAUSED: "paused", OVER: "over" };
const HIGHSCORE_KEY = "star_striker_highscore";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = 0;
    this.h = 0;

    this.input = new Input();
    this.audio = new AudioManager();
    this.state = STATE.MENU;

    this.player = null;
    this.enemies = [];
    this.playerBullets = [];
    this.enemyBullets = [];
    this.powerups = [];
    this.particles = [];
    this.boss = null;

    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.highscore = Number(localStorage.getItem(HIGHSCORE_KEY) || 0);

    this.spawnTimer = 0;
    this.enemiesToSpawn = 0;
    this.levelClearWait = 0;
    this.shake = 0;

    this._lastTime = 0;
    this._raf = null;
    this._callbacks = {};

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.input.onPause(() => this.togglePause());
  }

  on(event, cb) { this._callbacks[event] = cb; }
  _emit(event, ...args) { this._callbacks[event]?.(...args); }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.starfield) this.starfield = new Starfield(this.w, this.h);
    else this.starfield.resize(this.w, this.h);
    if (this.player) this.player.resize(this.w, this.h);
  }

  start() {
    this.audio.init();
    this.audio.resume();
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.enemies = [];
    this.playerBullets = [];
    this.enemyBullets = [];
    this.powerups = [];
    this.particles = [];
    this.boss = null;
    this.player = new Player(this.w, this.h);
    this.state = STATE.PLAYING;
    this._beginLevel();
    this._emit("hudUpdate", this.snapshot());
  }

  _beginLevel() {
    this.boss = null;
    this.levelClearWait = 0;
    // Every 5th level is a boss fight.
    this.isBossLevel = this.level % 5 === 0;
    if (this.isBossLevel) {
      this.boss = new Boss(this.w, this.h, this.level);
      this.enemiesToSpawn = 0;
      this.audio.levelUp();
      this._emit("toast", `第 ${this.level} 关 · BOSS 来袭`);
    } else {
      this.enemiesToSpawn = 6 + this.level * 2;
      this.spawnTimer = 0.5;
      if (this.level > 1) this.audio.levelUp();
      this._emit("toast", `第 ${this.level} 关`);
    }
  }

  togglePause() {
    if (this.state === STATE.PLAYING) {
      this.state = STATE.PAUSED;
      this._emit("pause");
    } else if (this.state === STATE.PAUSED) {
      this.state = STATE.PLAYING;
      this._emit("resume");
      this._lastTime = performance.now();
    }
  }

  loop() {
    const tick = (now) => {
      const dt = Math.min(0.05, (now - this._lastTime) / 1000) || 0;
      this._lastTime = now;
      this.update(dt);
      this.draw();
      this._raf = requestAnimationFrame(tick);
    };
    this._lastTime = performance.now();
    this._raf = requestAnimationFrame(tick);
  }

  _spawnWave(dt) {
    if (this.enemiesToSpawn <= 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = clamp(1.1 - this.level * 0.05, 0.35, 1.1);
      const levelScale = 1 + (this.level - 1) * 0.12;
      // Weight enemy types toward tougher ones at higher levels.
      const pool = ["grunt", "grunt", "weaver"];
      if (this.level >= 2) pool.push("weaver");
      if (this.level >= 3) pool.push("gunner");
      if (this.level >= 4) pool.push("gunner", "tank");
      const groupSize = randInt(1, Math.min(3, 1 + Math.floor(this.level / 2)));
      for (let i = 0; i < groupSize && this.enemiesToSpawn > 0; i++) {
        const key = choice(pool);
        const x = rand(40, this.w - 40);
        this.enemies.push(new Enemy(key, x, -30 - i * 36, levelScale));
        this.enemiesToSpawn--;
      }
    }
  }

  update(dt) {
    this.starfield.update(dt);
    // Animate particles even when not actively playing (menu ambiance).
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter((p) => !p.dead);

    if (this.state !== STATE.PLAYING) return;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 60);

    this.input.update();
    const player = this.player;
    player.update(dt, this.input);
    player.emitThruster(this.particles);

    if (this.input.firing) {
      const shots = player.tryShoot();
      if (shots) {
        this.playerBullets.push(...shots);
        this.audio.shoot();
      }
    }

    // Spawn / boss progression.
    if (this.boss) {
      this.boss.update(dt, this.w, this.h, player, this.enemyBullets, this.audio);
    } else {
      this._spawnWave(dt);
    }

    for (const e of this.enemies) e.update(dt, this.w, this.h, player, this.enemyBullets, this.audio);
    for (const b of this.playerBullets) b.update(dt, this.w, this.h);
    for (const b of this.enemyBullets) b.update(dt, this.w, this.h);
    for (const p of this.powerups) p.update(dt, this.w, this.h);

    this._handleCollisions();

    // Cleanup dead entities.
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.playerBullets = this.playerBullets.filter((b) => !b.dead);
    this.enemyBullets = this.enemyBullets.filter((b) => !b.dead);
    this.powerups = this.powerups.filter((p) => !p.dead);

    this._checkLevelProgress(dt);

    if (player.dead) this._gameOver();
  }

  _handleCollisions() {
    const player = this.player;

    // Player bullets vs enemies / boss.
    for (const b of this.playerBullets) {
      if (b.dead) continue;
      if (this.boss && !this.boss.dead && circleHit(b, this.boss)) {
        b.dead = true;
        const destroyed = this.boss.hit(b.damage);
        explode(this.particles, b.x, b.y, 4, ["#ffd84d", "#ff4d8d"], { maxSpeed: 120 });
        if (destroyed) this._onBossDestroyed();
        continue;
      }
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (circleHit(b, e)) {
          b.dead = true;
          const destroyed = e.hit(b.damage);
          if (destroyed) this._onEnemyDestroyed(e);
          else explode(this.particles, b.x, b.y, 3, [e.color, "#ffffff"], { maxSpeed: 90 });
          break;
        }
      }
    }

    // Enemy bullets vs player.
    for (const b of this.enemyBullets) {
      if (b.dead) continue;
      if (circleHit(b, player)) {
        b.dead = true;
        this._damagePlayer();
      }
    }

    // Enemies / boss bodies vs player.
    for (const e of this.enemies) {
      if (!e.dead && circleHit(e, player)) {
        const lost = this._damagePlayer();
        if (lost || player.invuln > 0) {
          e.dead = true;
          this._onEnemyDestroyed(e, false);
        }
      }
    }
    if (this.boss && !this.boss.dead && circleHit(this.boss, player)) {
      this._damagePlayer();
    }

    // Powerups vs player.
    for (const p of this.powerups) {
      if (!p.dead && circleHit(p, player)) {
        p.dead = true;
        this._applyPowerup(p.type);
      }
    }
  }

  _damagePlayer() {
    const player = this.player;
    if (player.invuln > 0) return false;
    const lostLife = player.takeHit();
    if (lostLife) {
      this.lives--;
      this.audio.hit();
      this.shake = 12;
      explode(this.particles, player.x, player.y, 24, ["#7df9ff", "#ffffff", "#3a8fff"], { maxSpeed: 260 });
      if (this.lives <= 0) {
        player.dead = true;
      } else {
        player.reset();
      }
      this._emit("hudUpdate", this.snapshot());
      return true;
    }
    // Shield absorbed it.
    this.audio.hit();
    explode(this.particles, player.x, player.y, 12, ["#38e1ff", "#ffffff"], { maxSpeed: 160 });
    this._emit("hudUpdate", this.snapshot());
    return false;
  }

  _onEnemyDestroyed(e, award = true) {
    explode(this.particles, e.x, e.y, e.isBoss ? 40 : 16, [e.color, "#ffffff", "#ffd84d"], {
      maxSpeed: 260, maxLife: 1,
    });
    this.audio.explosion();
    this.shake = Math.max(this.shake, 4);
    if (award) {
      this.score += e.score;
      this._maybeDrop(e);
      this._emit("hudUpdate", this.snapshot());
    }
  }

  _onBossDestroyed() {
    const b = this.boss;
    this.audio.bigExplosion();
    this.shake = 24;
    for (let i = 0; i < 6; i++) {
      explode(this.particles, b.x + rand(-40, 40), b.y + rand(-40, 40), 22,
        ["#ff4d8d", "#ffd84d", "#ffffff"], { maxSpeed: 300, maxLife: 1.3 });
    }
    this.score += b.score;
    // Guaranteed rewards from a boss.
    this.powerups.push(new PowerUp(b.x - 24, b.y, "weapon"));
    this.powerups.push(new PowerUp(b.x + 24, b.y, "shield"));
    if (Math.random() < 0.6) this.powerups.push(new PowerUp(b.x, b.y + 20, "life"));
    this._emit("hudUpdate", this.snapshot());
    this._emit("toast", "BOSS 已击破！");
  }

  _maybeDrop(e) {
    if (Math.random() > e.drop) return;
    const roll = Math.random();
    let type = "weapon";
    if (roll < 0.18) type = "life";
    else if (roll < 0.5) type = "shield";
    this.powerups.push(new PowerUp(e.x, e.y, type));
  }

  _applyPowerup(type) {
    this.audio.powerup();
    if (type === "weapon") {
      this.player.upgradeWeapon();
      this._emit("toast", "武器升级！");
    } else if (type === "shield") {
      this.player.addShield(1);
      this._emit("toast", "护盾充能");
    } else if (type === "life") {
      this.lives = Math.min(5, this.lives + 1);
      this._emit("toast", "+1 生命");
    }
    explode(this.particles, this.player.x, this.player.y, 14,
      [POWERUP_TYPES[type].color, "#ffffff"], { maxSpeed: 160 });
    this._emit("hudUpdate", this.snapshot());
  }

  _checkLevelProgress(dt) {
    const cleared = this.boss
      ? this.boss.dead
      : this.enemiesToSpawn <= 0 && this.enemies.length === 0;
    if (!cleared) return;
    this.levelClearWait += dt;
    // Brief pause between levels so drops can be collected.
    if (this.levelClearWait >= 1.6) {
      this.level++;
      this._beginLevel();
      this._emit("hudUpdate", this.snapshot());
    }
  }

  _gameOver() {
    this.state = STATE.OVER;
    let isRecord = false;
    if (this.score > this.highscore) {
      this.highscore = this.score;
      localStorage.setItem(HIGHSCORE_KEY, String(this.highscore));
      isRecord = true;
    }
    this._emit("gameOver", { score: this.score, highscore: this.highscore, isRecord });
  }

  snapshot() {
    return {
      score: this.score,
      lives: this.lives,
      level: this.level,
      highscore: this.highscore,
      shield: this.player ? this.player.shield : 0,
      weaponName: this.player ? this.player.weaponName : "单发",
    };
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    ctx.save();
    if (this.shake > 0) {
      ctx.translate(rand(-this.shake, this.shake) * 0.4, rand(-this.shake, this.shake) * 0.4);
    }

    this.starfield.draw(ctx);

    for (const p of this.particles) p.draw(ctx);
    for (const pw of this.powerups) pw.draw(ctx);
    for (const b of this.playerBullets) b.draw(ctx);
    for (const b of this.enemyBullets) b.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    if (this.boss && !this.boss.dead) this.boss.draw(ctx);

    if (this.player && (this.state === STATE.PLAYING || this.state === STATE.PAUSED)) {
      this.player.draw(ctx);
    }
    ctx.restore();

    if (this.boss && !this.boss.dead && !this.boss.entering) {
      this.boss.drawHealthBar(ctx, this.w);
    }
  }
}

export { STATE };
