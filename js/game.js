// Central game state machine: spawning, collisions, scoring, waves.
const STATE = { MENU: "menu", PLAYING: "playing", PAUSED: "paused", GAMEOVER: "gameover" };

class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.ui = ui;
    this.state = STATE.MENU;
    this.starfield = new Starfield(this.width, this.height);
    this.best = parseInt(localStorage.getItem("starblaze_best") || "0", 10);
    this.reset();
    ui.setBest(this.best);
  }

  reset() {
    this.player = new Player(this);
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.powerups = [];
    this.score = 0;
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveActive = false;
    this.waveBanner = 0;
    this.shake = 0;
    this.flash = 0;
    this.boss = null;
  }

  start() {
    this.reset();
    this.state = STATE.PLAYING;
    this.ui.showHUD();
    this.nextWave();
  }

  nextWave() {
    this.wave += 1;
    this.waveBanner = 2.2;
    Sound.wave();
    this.ui.setWave(this.wave);

    // Boss every 5th wave.
    if (this.wave % 5 === 0) {
      this.boss = new Boss(this, this.wave);
      this.enemies.push(this.boss);
      this.waveActive = true;
      return;
    }

    // Build a spawn queue scaling with the wave number.
    const count = 6 + this.wave * 2;
    const queue = [];
    for (let i = 0; i < count; i++) {
      let type = "grunt";
      const r = Math.random();
      if (this.wave >= 2 && r < 0.3) type = "diver";
      if (this.wave >= 3 && r < 0.18) type = "weaver";
      if (this.wave >= 4 && r < 0.1) type = "tank";
      queue.push(type);
    }
    this.spawnQueue = queue;
    this.spawnTimer = 0.5;
    this.waveActive = true;
  }

  spawnFromQueue(dt) {
    if (this.spawnQueue.length === 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const type = this.spawnQueue.shift();
      const x = Utils.rand(40, this.width - 40);
      this.enemies.push(new Enemy(this, type, x, -30));
      this.spawnTimer = Utils.rand(0.4, 0.9);
    }
  }

  addScore(n) {
    this.score += n;
    this.ui.setScore(this.score);
  }

  triggerBomb() {
    this.flash = 0.4;
    this.shake = 16;
    Sound.bomb();
    for (const e of this.enemies) {
      if (e.isBoss) {
        e.hurt(20);
        continue;
      }
      Particles.explosion(this.particles, e.x, e.y, e.color, 1.2);
      this.addScore(Math.round(e.score * 0.5));
      e.dead = true;
    }
    // Clear enemy bullets.
    this.bullets = this.bullets.filter((b) => b.friendly);
  }

  collectPowerUp(pu) {
    Sound.powerup();
    Particles.burst(this.particles, pu.x, pu.y, 14, {
      speed: 160, life: 0.6, color: POWERUP_TYPES[pu.type].color,
    });
    if (pu.type === "power") this.player.upgradeWeapon();
    else if (pu.type === "shield") this.player.addShield(40);
    else if (pu.type === "bomb") this.triggerBomb();
    this.ui.setWeapon(this.player.weaponName);
  }

  update(dt, input) {
    this.starfield.update(dt, this.state === STATE.PLAYING ? 1 : 0.3);
    if (this.state !== STATE.PLAYING) return;

    if (this.waveBanner > 0) this.waveBanner -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 40);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.2);

    this.player.update(dt, input);
    this.spawnFromQueue(dt);

    for (const e of this.enemies) e.update(dt);
    for (const b of this.bullets) b.update(dt, this.width, this.height);
    for (const p of this.particles) p.update(dt);
    for (const pu of this.powerups) pu.update(dt, this.width, this.height);

    this.handleCollisions();

    // Cleanup.
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    this.powerups = this.powerups.filter((pu) => !pu.dead);

    if (this.boss && this.boss.dead) this.boss = null;

    // Wave complete?
    if (this.waveActive && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveActive = false;
      this.nextWave();
    }

    // HUD sync.
    this.ui.setHealth(this.player.health / this.player.maxHealth);
    this.ui.setLives(this.player.lives);

    if (this.player.dead) this.gameOver();
  }

  handleCollisions() {
    const p = this.player;

    for (const b of this.bullets) {
      if (b.dead) continue;
      if (b.friendly) {
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (Utils.hit(b, e)) {
            b.dead = true;
            Particles.burst(this.particles, b.x, b.y, 4, { speed: 90, life: 0.3, color: "#7df9ff", size: 2 });
            if (e.hurt(b.damage)) this.onEnemyKilled(e);
            break;
          }
        }
      } else {
        if (Utils.hit(b, p)) {
          b.dead = true;
          this.onPlayerHit(b.damage);
        }
      }
    }

    // Enemy bodies vs player.
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Utils.hit(e, p)) {
        if (!e.isBoss) {
          Particles.explosion(this.particles, e.x, e.y, e.color, 1);
          e.dead = true;
          this.addScore(Math.round(e.score * 0.4));
        }
        this.onPlayerHit(24);
      }
    }

    // Power-up pickups.
    for (const pu of this.powerups) {
      if (pu.dead) continue;
      if (Utils.hit(pu, p)) {
        pu.dead = true;
        this.collectPowerUp(pu);
      }
    }
  }

  onEnemyKilled(e) {
    Sound.explosion();
    Particles.explosion(this.particles, e.x, e.y, e.color, e.isBoss ? 3 : 1);
    this.addScore(e.score);
    this.shake = Math.max(this.shake, e.isBoss ? 18 : 5);

    if (e.isBoss) {
      this.flash = 0.5;
      // Boss drops several power-ups.
      for (let i = 0; i < 3; i++) {
        this.powerups.push(new PowerUp(e.x + Utils.rand(-40, 40), e.y, PowerUp.randomType()));
      }
    } else if (Math.random() < 0.16) {
      this.powerups.push(new PowerUp(e.x, e.y, PowerUp.randomType()));
    }
  }

  onPlayerHit(dmg) {
    const destroyed = this.player.hurt(dmg);
    this.shake = Math.max(this.shake, destroyed ? 14 : 6);
    if (destroyed) {
      Sound.explosion();
      Particles.explosion(this.particles, this.player.x, this.player.y, "#4cc9f0", 2);
    }
  }

  gameOver() {
    this.state = STATE.GAMEOVER;
    Sound.gameover();
    const isBest = this.score > this.best;
    if (isBest) {
      this.best = this.score;
      localStorage.setItem("starblaze_best", String(this.best));
    }
    this.ui.showGameOver(this.score, this.wave, this.best, isBest);
  }

  pause() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.PAUSED;
    this.ui.showPause();
  }

  resume() {
    if (this.state !== STATE.PAUSED) return;
    this.state = STATE.PLAYING;
    this.ui.hidePause();
  }

  togglePause() {
    if (this.state === STATE.PLAYING) this.pause();
    else if (this.state === STATE.PAUSED) this.resume();
  }

  toMenu() {
    this.state = STATE.MENU;
    this.reset();
    this.ui.showMenu();
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    if (this.shake > 0) {
      ctx.translate(Utils.rand(-this.shake, this.shake), Utils.rand(-this.shake, this.shake));
    }

    this.starfield.draw(ctx);

    for (const pu of this.powerups) pu.draw(ctx);
    for (const p of this.particles) p.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    for (const b of this.bullets) b.draw(ctx);

    if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) {
      if (!this.player.dead) this.player.draw(ctx);
    }

    ctx.restore();

    // Wave banner.
    if (this.waveBanner > 0 && this.state === STATE.PLAYING) {
      const a = Math.min(1, this.waveBanner) * Math.min(1, (2.2 - this.waveBanner) * 3);
      ctx.globalAlpha = Utils.clamp(a, 0, 1);
      ctx.fillStyle = "#e8ecff";
      ctx.font = "bold 40px system-ui, sans-serif";
      ctx.textAlign = "center";
      const label = this.wave % 5 === 0 ? "⚠ 头目来袭" : `第 ${this.wave} 波`;
      ctx.fillText(label, this.width / 2, this.height / 2 - 20);
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillStyle = "#8a93b8";
      if (this.wave % 5 !== 0) ctx.fillText("击毁所有敌舰", this.width / 2, this.height / 2 + 12);
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";
    }

    // Screen flash (bomb / boss death).
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }
  }
}
