/* Nebula Strike — main game controller: loop, state machine, waves, collisions. */
(function (global) {
  "use strict";

  const STATE = { MENU: "menu", PLAYING: "playing", PAUSED: "paused", GAMEOVER: "gameover" };

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.w = canvas.width;
      this.h = canvas.height;

      this.starfield = new Starfield(this.w, this.h);
      this.particles = new Particles(700);
      this.player = new Player(this);

      this.state = STATE.MENU;
      this.best = Utils.loadBest();

      this.bullets = [];
      this.enemyBullets = [];
      this.enemies = [];
      this.powerups = [];
      this.boss = null;

      this.score = 0;
      this.wave = 0;
      this.waveTimer = 0;
      this.spawnQueue = [];
      this.spawnTimer = 0;
      this.betweenWaves = false;
      this.shakeAmt = 0;
      this.banner = null;
      this.bannerTimer = 0;

      this.last = performance.now();
      this.acc = 0;
      this.running = false;

      // UI callback hooks set by main.js.
      this.onStateChange = null;
    }

    /* ------------------------- State control ------------------------- */
    setState(s) {
      this.state = s;
      if (this.onStateChange) this.onStateChange(s);
    }

    startGame() {
      audio.ensure();
      audio.startMusic();
      this.player.reset();
      this.bullets.length = 0;
      this.enemyBullets.length = 0;
      this.enemies.length = 0;
      this.powerups.length = 0;
      this.boss = null;
      this.particles.clear();
      this.score = 0;
      this.wave = 0;
      this.betweenWaves = false;
      this.shakeAmt = 0;
      this.newBest = false;
      this.nextWave();
      this.setState(STATE.PLAYING);
    }

    pause() {
      if (this.state !== STATE.PLAYING) return;
      this.setState(STATE.PAUSED);
      audio.stopMusic();
    }

    resume() {
      if (this.state !== STATE.PAUSED) return;
      this.setState(STATE.PLAYING);
      this.last = performance.now();
      audio.startMusic();
    }

    quitToMenu() {
      audio.stopMusic();
      this.setState(STATE.MENU);
    }

    gameOver() {
      audio.stopMusic();
      audio.gameOver();
      this.newBest = this.score > this.best;
      if (this.newBest) {
        this.best = this.score;
        Utils.saveBest(this.best);
      }
      this.setState(STATE.GAMEOVER);
    }

    shake(amt) {
      this.shakeAmt = Math.min(30, this.shakeAmt + amt);
    }

    showBanner(text, time) {
      this.banner = text;
      this.bannerTimer = time || 2.2;
    }

    /* ------------------------- Wave system ------------------------- */
    nextWave() {
      this.wave++;
      this.betweenWaves = false;
      const isBoss = this.wave % 5 === 0;
      if (isBoss) {
        const level = Math.floor(this.wave / 5);
        this.boss = new Boss(this, level);
        this.showBanner("WARNING — BOSS INCOMING", 2.4);
        audio.waveClear();
      } else {
        this.buildWaveQueue();
        this.showBanner("WAVE " + this.wave, 1.6);
      }
    }

    buildWaveQueue() {
      this.spawnQueue = [];
      const w = this.wave;
      const baseHp = (type) => {
        const tier = 1 + Math.floor(w / 3);
        if (type === "turret") return 5 + tier * 2;
        if (type === "diver") return 2 + tier;
        if (type === "zigzag") return 2 + Math.floor(tier / 2);
        return 1 + Math.floor(tier / 2);
      };
      const count = 6 + w * 2;
      const types = ["grunt", "grunt", "zigzag"];
      if (w >= 2) types.push("diver");
      if (w >= 3) types.push("zigzag", "diver");
      if (w >= 4) types.push("turret");

      for (let i = 0; i < count; i++) {
        const type = Utils.pick(types);
        this.spawnQueue.push({
          type,
          hp: baseHp(type),
          delay: Utils.rand(0.25, 0.7),
          x: Utils.rand(40, this.w - 40),
        });
      }
      this.spawnTimer = 0.6;
    }

    /* ------------------------- Main loop ------------------------- */
    start() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      const loop = (now) => {
        if (!this.running) return;
        let dt = (now - this.last) / 1000;
        this.last = now;
        if (dt > 0.05) dt = 0.05; // clamp big frame gaps
        this.update(dt);
        this.render();
        input.endFrame();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    update(dt) {
      this.starfield.update(dt);

      if (this.state !== STATE.PLAYING) {
        // Keep particles drifting subtly behind menus.
        this.particles.update(dt);
        return;
      }

      if (this.bannerTimer > 0) this.bannerTimer -= dt;
      this.shakeAmt *= Math.pow(0.0001, dt); // smooth decay

      this.player.update(dt);
      if (this.player.dead) { this.gameOver(); return; }

      this.updateSpawns(dt);
      this.updateBoss(dt);

      // Bullets.
      for (const b of this.bullets) b.update(dt);
      for (const b of this.enemyBullets) b.update(dt);

      for (const e of this.enemies) e.update(dt);
      for (const p of this.powerups) p.update(dt);

      this.handleCollisions();
      this.particles.update(dt);

      // Cleanup.
      this.bullets = this.bullets.filter((b) => !b.dead && this.inBounds(b));
      this.enemyBullets = this.enemyBullets.filter((b) => !b.dead && this.inBounds(b));
      this.enemies = this.enemies.filter((e) => !e.dead);
      this.powerups = this.powerups.filter((p) => !p.dead);

      // Wave progression.
      if (!this.boss && this.spawnQueue.length === 0 && this.enemies.length === 0 && !this.betweenWaves) {
        this.betweenWaves = true;
        this.waveTimer = 2.0;
        audio.waveClear();
        this.score += 250; // wave clear bonus
        this.particles.text(this.w / 2, this.h / 2, "WAVE CLEAR  +250", "#6dff9e");
      }
      if (this.betweenWaves) {
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) this.nextWave();
      }
    }

    inBounds(b) {
      return b.x > -30 && b.x < this.w + 30 && b.y > -40 && b.y < this.h + 40;
    }

    updateSpawns(dt) {
      if (this.spawnQueue.length === 0) return;
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const s = this.spawnQueue.shift();
        const e = new Enemy(this, s.type, s.x, -30, s.hp);
        this.enemies.push(e);
        this.spawnTimer = s.delay;
      }
    }

    updateBoss(dt) {
      if (!this.boss) return;
      this.boss.update(dt);
      if (this.boss.dead) {
        this.particles.explosion(this.boss.x, this.boss.y, "#ff4fd8", true);
        this.particles.explosion(this.boss.x + 30, this.boss.y, "#ffd166", true);
        this.particles.explosion(this.boss.x - 30, this.boss.y + 10, "#46e8ff", true);
        audio.bigExplosion();
        this.shake(28);
        this.score += this.boss.score;
        this.particles.text(this.boss.x, this.boss.y, "+" + this.boss.score, "#ffd166");
        // Reward power-ups.
        for (let i = 0; i < 3; i++) {
          this.powerups.push(new PowerUp(this, this.boss.x + Utils.rand(-60, 60), this.boss.y, Utils.pick(["spread", "rapid", "shield", "heal"])));
        }
        this.boss = null;
        this.betweenWaves = true;
        this.waveTimer = 2.6;
        this.showBanner("BOSS DOWN!", 2.0);
      }
    }

    /* ------------------------- Collisions ------------------------- */
    handleCollisions() {
      const player = this.player;

      // Player bullets vs enemies + boss.
      for (const b of this.bullets) {
        if (b.dead) continue;
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (Utils.circlesHit(b.x, b.y, b.r, e.x, e.y, e.r)) {
            e.hurt(b.dmg);
            b.dead = true;
            audio.hit();
            this.particles.burst(b.x, b.y, e.color);
            if (e.dead) this.killEnemy(e);
            break;
          }
        }
        if (b.dead) continue;
        if (this.boss && Utils.circlesHit(b.x, b.y, b.r, this.boss.x, this.boss.y, this.boss.r)) {
          this.boss.hurt(b.dmg);
          b.dead = true;
          audio.hit();
          this.particles.burst(b.x, b.y, "#ff4fd8");
        }
      }

      // Enemy bullets vs player.
      for (const b of this.enemyBullets) {
        if (b.dead) continue;
        if (Utils.circlesHit(b.x, b.y, b.r, player.x, player.y, player.r * 0.8)) {
          b.dead = true;
          player.hurt(b.dmg);
        }
      }

      // Enemy bodies vs player.
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Utils.circlesHit(e.x, e.y, e.r, player.x, player.y, player.r * 0.8)) {
          e.hurt(999);
          this.killEnemy(e);
          player.hurt(18);
        }
      }
      if (this.boss && player.invuln <= 0 && Utils.circlesHit(this.boss.x, this.boss.y, this.boss.r, player.x, player.y, player.r)) {
        player.hurt(20);
      }

      // Power-ups vs player.
      for (const p of this.powerups) {
        if (p.dead) continue;
        if (Utils.circlesHit(p.x, p.y, p.r + 6, player.x, player.y, player.r)) {
          p.dead = true;
          player.addPower(p.type);
          audio.powerup();
          const labels = { spread: "SPREAD!", rapid: "RAPID FIRE!", shield: "SHIELD!", heal: "REPAIR!" };
          this.particles.text(p.x, p.y, labels[p.type], "#fff");
          this.particles.burst(p.x, p.y, "#fff");
        }
      }
    }

    killEnemy(e) {
      this.score += e.score;
      this.particles.explosion(e.x, e.y, e.color, false);
      this.particles.text(e.x, e.y, "+" + e.score, "#cfe3ff");
      audio.explosion();
      this.shake(4);
      // Drop chance for power-up.
      if (Utils.chance(0.12)) {
        this.powerups.push(new PowerUp(this, e.x, e.y));
      }
    }

    /* ------------------------- Render ------------------------- */
    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      ctx.save();
      if (this.shakeAmt > 0.5 && this.state === STATE.PLAYING) {
        ctx.translate(Utils.rand(-this.shakeAmt, this.shakeAmt), Utils.rand(-this.shakeAmt, this.shakeAmt));
      }

      this.starfield.draw(ctx);

      if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) {
        for (const p of this.powerups) p.draw(ctx);
        for (const e of this.enemies) e.draw(ctx);
        if (this.boss) this.boss.draw(ctx);
        for (const b of this.bullets) b.draw(ctx);
        for (const b of this.enemyBullets) b.draw(ctx);
        if (!this.player.dead) this.player.draw(ctx);
        this.particles.draw(ctx);
        this.drawBanner(ctx);
      } else {
        this.particles.draw(ctx);
      }

      ctx.restore();

      // Vignette.
      const vg = ctx.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.3, this.w / 2, this.h / 2, this.h * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    drawBanner(ctx) {
      if (this.bannerTimer <= 0 || !this.banner) return;
      const a = Utils.clamp(this.bannerTimer, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = "center";
      ctx.font = "bold 46px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = this.banner.indexOf("BOSS") >= 0 ? "#ff4fd8" : "#46e8ff";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 24;
      ctx.fillText(this.banner, this.w / 2, this.h / 2 - 40);
      ctx.restore();
    }
  }

  Game.STATE = STATE;
  global.Game = Game;
})(window);
