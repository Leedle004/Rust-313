/* Nebula Strike — bootstrap: wires the DOM/UI to the Game instance. */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("game-canvas");
  const game = new Game(canvas);
  input.attach(canvas);
  // Exposed for debugging/automated testing; harmless in normal play.
  window.__nebula = game;

  const ui = {
    hud: $("hud"),
    menu: $("menu"),
    how: $("how"),
    pause: $("pause"),
    gameover: $("gameover"),
    score: $("hud-score"),
    wave: $("hud-wave"),
    best: $("hud-best"),
    lives: $("hud-lives"),
    bossBar: $("boss-bar"),
    bossFill: $("boss-bar-fill"),
    menuBest: $("menu-best"),
    goScore: $("go-score"),
    goWave: $("go-wave"),
    goBest: $("go-best"),
    goNewBest: $("go-newbest"),
    muteBtn: $("btn-mute"),
  };

  function showOnly(state) {
    ui.menu.classList.add("hidden");
    ui.how.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.gameover.classList.add("hidden");
    ui.hud.classList.add("hidden");

    if (state === Game.STATE.MENU) {
      ui.menu.classList.remove("hidden");
      ui.menuBest.textContent = Utils.formatScore(game.best);
    } else if (state === Game.STATE.PLAYING) {
      ui.hud.classList.remove("hidden");
    } else if (state === Game.STATE.PAUSED) {
      ui.hud.classList.remove("hidden");
      ui.pause.classList.remove("hidden");
    } else if (state === Game.STATE.GAMEOVER) {
      ui.gameover.classList.remove("hidden");
      ui.goScore.textContent = Utils.formatScore(game.score);
      ui.goWave.textContent = game.wave;
      ui.goBest.textContent = Utils.formatScore(game.best);
      ui.goNewBest.classList.toggle("hidden", !game.newBest);
    }
  }

  game.onStateChange = showOnly;

  // HUD refresh (runs on its own light interval, decoupled from render).
  let lastLives = -1;
  function refreshHud() {
    if (game.state === Game.STATE.PLAYING || game.state === Game.STATE.PAUSED) {
      ui.score.textContent = Utils.formatScore(game.score);
      ui.wave.textContent = game.wave;
      ui.best.textContent = Utils.formatScore(Math.max(game.best, game.score));

      if (game.player.lives !== lastLives) {
        lastLives = game.player.lives;
        ui.lives.innerHTML = "";
        for (let i = 0; i < game.player.lives; i++) {
          const pip = document.createElement("div");
          pip.className = "life-pip";
          ui.lives.appendChild(pip);
        }
      }

      if (game.boss) {
        ui.bossBar.classList.remove("hidden");
        const pct = Utils.clamp(game.boss.hp / game.boss.maxHp, 0, 1) * 100;
        ui.bossFill.style.width = pct + "%";
      } else {
        ui.bossBar.classList.add("hidden");
      }
    }
    requestAnimationFrame(refreshHud);
  }

  /* ------------------------- Button wiring ------------------------- */
  function click(el, fn) {
    el.addEventListener("click", () => {
      audio.ensure();
      audio.uiClick();
      fn();
    });
  }

  click($("btn-start"), () => game.startGame());
  click($("btn-how"), () => { ui.menu.classList.add("hidden"); ui.how.classList.remove("hidden"); });
  click($("btn-how-back"), () => { ui.how.classList.add("hidden"); ui.menu.classList.remove("hidden"); });
  click($("btn-resume"), () => game.resume());
  click($("btn-quit"), () => game.quitToMenu());
  click($("btn-retry"), () => game.startGame());
  click($("btn-menu"), () => game.quitToMenu());

  function updateMuteLabel() {
    ui.muteBtn.textContent = "SOUND: " + (audio.muted ? "OFF" : "ON");
  }
  click(ui.muteBtn, () => { audio.toggleMute(); updateMuteLabel(); });
  updateMuteLabel();

  // Keyboard shortcuts: pause/resume + quick start.
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "p" || k === "escape") {
      if (game.state === Game.STATE.PLAYING) game.pause();
      else if (game.state === Game.STATE.PAUSED) game.resume();
    }
    if ((k === "enter" || k === " ") && (game.state === Game.STATE.MENU)) {
      // Avoid hijacking space during play; only from menu.
      if (game.state === Game.STATE.MENU) { audio.ensure(); game.startGame(); }
    }
    if (k === "r" && game.state === Game.STATE.GAMEOVER) game.startGame();
    if (k === "m") { audio.toggleMute(); updateMuteLabel(); }
  });

  // Auto-pause when tab loses focus during play.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.state === Game.STATE.PLAYING) game.pause();
  });

  // Boot.
  showOnly(Game.STATE.MENU);
  game.start();
  refreshHud();
})();
