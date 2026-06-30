/* Nebula Strike — game controller, wave director, collisions, rendering */
(function (global) {
  "use strict";

  const { Particle, Bullet, Player, Enemy, Boss, PowerUp, Star, POWER_KINDS } = Entities;

  const STATE = { MENU: "menu", PLAYING: "playing", PAUSED: "paused", OVER: "over" };

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.w = canvas.width;
      this.h = canvas.height;
      this.state = STATE.MENU;
      this.best = U.storage.get("ns_best", 0);
      this.stars = [];
      this.onHud = null; // callback set by main.js
      this.onStateChange = null;
      this._shake = 0;
      this._lastTime = 0;
      this.initStars();
    }

    initStars() {
      this.stars = [];
      const n = Math.round((this.w * this.h) / 6000);
      for (let i = 0; i < n; i++) this.stars.push(new Star(this));
    }

    resize(w, h) {
      this.w = w; this.h = h;
      this.canvas.width = w; this.canvas.height = h;
      this.initStars();
      if (this.player) {
        this.player.x = U.clamp(this.player.x, 0, w);
        this.player.y = U.clamp(this.player.y, 0, h);
      }
    }

    /* ----------------------------------------------------------- lifecycle */
    start() {
      this.player = new Player(this);
      this.bullets = [];
      this.enemies = [];
      this.powerups = [];
      this.particles = [];
      this.score = 0;
      this.level = 1;
      this.lives = 3;
      this.bombs = 2;
      this.combo = 0;
      this.comboTimer = 0;
      this.spawnTimer = 0;
      this.waveRemaining = 0;
      this.boss = null;
      this.bossPending = false;
      this.levelBanner = 2.0;
      this._shake = 0;
      this.setState(STATE.PLAYING);
      this.beginLevel();
      this.emitHud();
    }

    beginLevel() {
      // number of enemies to spawn this wave
      this.waveRemaining = 8 + this.level * 4;
      this.spawnTimer = 0.5;
      this.levelBanner = 2.0;
      // boss every 5 levels
      this.bossPending = this.level % 5 === 0;
      if (this.level > 1) Audio.levelup();
    }

    setState(s) {
      this.state = s;
      if (this.onStateChange) this.onStateChange(s);
    }

    pause() { if (this.state === STATE.PLAYING) this.setState(STATE.PAUSED); }
    resume() { if (this.state === STATE.PAUSED) { this.setState(STATE.PLAYING); this._lastTime = performance.now(); } }
    quitToMenu() { this.setState(STATE.MENU); }

    /* -------------------------------------------------------------- events */
    onEnemyKilled(e) {
      this.combo++;
      this.comboTimer = 2.5;
      const mult = 1 + Math.floor(this.combo / 5) * 0.5;
      this.score += Math.round(e.score * mult);
      this.explosion(e.x, e.y, e.color);
      Audio.explode();
      // power-up drop chance
      if (U.chance(0.12)) {
        this.powerups.push(new PowerUp(e.x, e.y, U.pick(POWER_KINDS)));
      }
      this.emitHud();
    }

    onBossKilled(b) {
      this.score += b.score;
      this.bigExplosion(b.x, b.y, b.color);
      for (let i = 0; i < 5; i++) {
        setTimeout(() => this.bigExplosion(b.x + U.rand(-50, 50), b.y + U.rand(-50, 50), U.pick(["#ff4ce0", "#ffcf4c", "#4cf0ff"])), i * 120);
      }
      Audio.bigExplode();
      this.boss = null;
      // drop a couple of power-ups
      this.powerups.push(new PowerUp(b.x - 20, b.y, "life"));
      this.powerups.push(new PowerUp(b.x + 20, b.y, U.pick(["spread", "rapid", "shield"])));
      this.nextLevel();
      this.emitHud();
    }

    nextLevel() {
      this.level++;
      this.beginLevel();
      this.emitHud();
    }

    collectPower(p) {
      Audio.powerup();
      this.burst(p.x, p.y, p.info.color, 18, 200);
      if (p.kind === "life") { this.lives = Math.min(this.lives + 1, 6); }
      else if (p.kind === "bomb") { this.bombs = Math.min(this.bombs + 1, 5); }
      else this.player.applyPower(p.kind);
      this.emitHud();
    }

    useBomb() {
      if (this.bombs <= 0 || this.state !== STATE.PLAYING) return;
      this.bombs--;
      this.shake(18);
      Audio.bomb();
      // clear enemy bullets, damage everything
      this.bullets = this.bullets.filter(b => !b.enemy);
      this.enemies.forEach(e => {
        this.explosion(e.x, e.y, e.color);
        this.score += Math.round(e.score * 0.5);
        e.dead = true;
      });
      this.enemies = [];
      if (this.boss) this.boss.hurt(25, this);
      // shockwave particles
      for (let i = 0; i < 60; i++) {
        this.particles.push(new Particle(this.player.x, this.player.y, "#ff6a3c", { speed: U.rand(200, 500), life: 0.7, size: 3 }));
      }
      this.emitHud();
    }

    /* ----------------------------------------------------------- particles */
    burst(x, y, color, count, speed) {
      for (let i = 0; i < count; i++) {
        this.particles.push(new Particle(x, y, color, { speed: speed ? U.rand(speed * 0.3, speed) : undefined }));
      }
    }
    explosion(x, y, color) {
      this.burst(x, y, color, 18, 280);
      this.burst(x, y, "#ffffff", 6, 200);
      this.shake(5);
    }
    bigExplosion(x, y, color) {
      this.burst(x, y, color, 40, 420);
      this.burst(x, y, "#ffcf4c", 20, 300);
      this.burst(x, y, "#ffffff", 12, 240);
      this.shake(14);
    }
    shake(amt) { this._shake = Math.max(this._shake, amt); }

    /* -------------------------------------------------------------- spawns */
    spawnWaveEnemy() {
      const x = U.rand(40, this.w - 40);
      const roll = Math.random();
      let type = "grunt";
      const lv = this.level;
      if (roll < 0.40) type = "grunt";
      else if (roll < 0.62) type = "weaver";
      else if (roll < 0.80 && lv >= 2) type = "shooter";
      else if (roll < 0.92 && lv >= 3) type = "tank";
      else type = "asteroid";
      this.enemies.push(new Enemy(this, type, x, -30));
    }

    /* --------------------------------------------------------------- update */
    update(dt) {
      // starfield always animates (even on menu)
      for (const s of this.stars) s.update(dt, this);

      if (this.state !== STATE.PLAYING) return;

      this.levelBanner -= dt;

      // combo decay
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) { this.combo = 0; this.emitHud(); }
      }

      // bomb input
      if (Input.consumeBomb()) this.useBomb();

      this.player.update(dt, this);

      // spawning
      if (!this.boss) {
        if (this.bossPending && this.waveRemaining <= 0 && this.enemies.length === 0) {
          this.boss = new Boss(this);
          this.bossPending = false;
          Audio.levelup();
        } else if (this.waveRemaining > 0) {
          this.spawnTimer -= dt;
          if (this.spawnTimer <= 0) {
            this.spawnWaveEnemy();
            this.waveRemaining--;
            this.spawnTimer = U.clamp(1.1 - this.level * 0.05, 0.35, 1.1);
          }
        } else if (this.enemies.length === 0 && !this.bossPending) {
          // wave cleared -> next level
          this.nextLevel();
        }
      }

      // entities
      for (const b of this.bullets) b.update(dt, this);
      for (const e of this.enemies) e.update(dt, this);
      for (const p of this.powerups) p.update(dt, this);
      for (const pt of this.particles) pt.update(dt);
      if (this.boss) this.boss.update(dt, this);

      this.collisions();

      // cleanup
      this.bullets = this.bullets.filter(b => !b.dead);
      this.enemies = this.enemies.filter(e => !e.dead);
      this.powerups = this.powerups.filter(p => !p.dead);
      this.particles = this.particles.filter(p => !p.dead);

      if (this._shake > 0) this._shake = Math.max(0, this._shake - dt * 40);
    }

    collisions() {
      const p = this.player;
      // player bullets vs enemies / boss
      for (const b of this.bullets) {
        if (b.enemy || b.dead) continue;
        if (this.boss && !this.boss.dead && U.hit(b, this.boss)) {
          this.boss.hurt(b.dmg, this); b.dead = true; continue;
        }
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (U.hit(b, e)) { e.hurt(b.dmg, this); b.dead = true; break; }
        }
      }

      if (p.dead) return;

      // enemy bullets vs player
      for (const b of this.bullets) {
        if (!b.enemy || b.dead) continue;
        if (U.hit(b, p)) { b.dead = true; this.damagePlayer(); }
      }
      // enemies vs player (ramming)
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (U.hit(e, p)) {
          this.explosion(e.x, e.y, e.color);
          e.dead = true;
          this.combo = 0;
          this.damagePlayer();
        }
      }
      // boss body vs player
      if (this.boss && !this.boss.dead && this.boss.phase === "fight" && U.hit(this.boss, p)) {
        this.damagePlayer();
      }
      // powerups vs player
      for (const pu of this.powerups) {
        if (pu.dead) continue;
        if (U.dist2(pu.x, pu.y, p.x, p.y) <= (pu.r + p.r + 6) ** 2) { pu.dead = true; this.collectPower(pu); }
      }
    }

    damagePlayer() {
      const died = this.player.hurt(this);
      if (!died) { this.emitHud(); return; }
      this.lives--;
      this.combo = 0;
      Audio.bigExplode();
      this.shake(20);
      this.emitHud();
      if (this.lives <= 0) {
        this.gameOver();
      } else {
        // respawn
        setTimeout(() => {
          if (this.state === STATE.PLAYING) {
            this.player = new Player(this);
          }
        }, 700);
      }
    }

    gameOver() {
      this.newBest = false;
      if (this.score > this.best) { this.best = this.score; this.newBest = true; U.storage.set("ns_best", this.best); }
      Audio.gameover();
      this.setState(STATE.OVER);
    }

    emitHud() {
      if (this.onHud) this.onHud({
        score: this.score, level: this.level, best: Math.max(this.best, this.score),
        lives: this.lives, bombs: this.bombs, combo: this.combo,
        powers: this.player ? this.player.powerLabels() : []
      });
    }

    /* --------------------------------------------------------------- render */
    render() {
      const c = this.ctx;
      c.clearRect(0, 0, this.w, this.h);
      c.save();
      if (this._shake > 0) c.translate(U.rand(-this._shake, this._shake), U.rand(-this._shake, this._shake));

      for (const s of this.stars) s.draw(c);

      if (this.state === STATE.PLAYING || this.state === STATE.PAUSED || this.state === STATE.OVER) {
        for (const pu of this.powerups) pu.draw(c);
        for (const e of this.enemies) e.draw(c);
        if (this.boss) this.boss.draw(c);
        for (const b of this.bullets) b.draw(c);
        for (const pt of this.particles) pt.draw(c);
        if (this.player && !this.player.dead) this.player.draw(c);

        if (this.levelBanner > 0 && this.state === STATE.PLAYING) {
          const a = U.clamp(this.levelBanner, 0, 1);
          c.globalAlpha = a;
          c.fillStyle = "#4cf0ff";
          c.font = "900 44px system-ui, sans-serif";
          c.textAlign = "center"; c.textBaseline = "middle";
          c.shadowBlur = 20; c.shadowColor = "#4cf0ff";
          const label = this.bossPending || this.boss ? "WARNING — BOSS" : "WAVE " + this.level;
          c.fillText(label, this.w / 2, this.h * 0.32);
          c.shadowBlur = 0;
          c.globalAlpha = 1;
        }
      }
      c.restore();
    }

    frame(now) {
      if (!this._lastTime) this._lastTime = now;
      let dt = (now - this._lastTime) / 1000;
      this._lastTime = now;
      dt = Math.min(dt, 0.05); // clamp big gaps (tab switches)
      this.update(dt);
      this.render();
      Input.clearFrame();
    }
  }

  Game.STATE = STATE;
  global.Game = Game;
})(window);
