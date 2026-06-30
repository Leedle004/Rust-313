/* Nebula Strike — bootstrap: wires DOM, input, resize, HUD, and the loop */
(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const $ = (id) => document.getElementById(id);

  // size the canvas to the viewport (capped DPR for perf on tiny devices)
  function fit(game) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    game.resize(w, h);
  }

  // init engine
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const game = new Game(canvas);
  window.__game = game; // exposed for debugging/automated tests
  Input.init(canvas);
  fit(game);
  window.addEventListener("resize", () => fit(game));

  // ----- UI elements
  const ui = {
    hud: $("hud"), menu: $("menu"), how: $("how"), pause: $("pause"), over: $("over"),
    score: $("score"), level: $("level"), best: $("best"),
    lives: $("lives"), combo: $("combo"), powerbar: $("powerbar"),
    menuBest: $("menuBest"),
    finalScore: $("finalScore"), finalLevel: $("finalLevel"), finalBest: $("finalBest"),
    newBest: $("newBest"), bombBtn: $("bombBtn")
  };

  function showOnly(state) {
    ui.menu.classList.add("hidden");
    ui.how.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.over.classList.add("hidden");
    ui.hud.classList.add("hidden");
    ui.bombBtn.classList.add("hidden");

    if (state === Game.STATE.MENU) {
      ui.menu.classList.remove("hidden");
      ui.menuBest.textContent = game.best;
    } else if (state === Game.STATE.PLAYING) {
      ui.hud.classList.remove("hidden");
      if (isTouch) ui.bombBtn.classList.remove("hidden");
    } else if (state === Game.STATE.PAUSED) {
      ui.hud.classList.remove("hidden");
      ui.pause.classList.remove("hidden");
    } else if (state === Game.STATE.OVER) {
      ui.finalScore.textContent = game.score;
      ui.finalLevel.textContent = game.level;
      ui.finalBest.textContent = game.best;
      ui.newBest.classList.toggle("hidden", !game.newBest);
      ui.over.classList.remove("hidden");
    }
  }

  const isTouch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;

  game.onStateChange = showOnly;

  // HUD render
  game.onHud = (s) => {
    ui.score.textContent = s.score;
    ui.level.textContent = s.level;
    ui.best.textContent = s.best;

    let hearts = "";
    for (let i = 0; i < s.lives; i++) hearts += "♥";
    ui.lives.innerHTML = `<span style="color:#ff4ce0">${hearts || "—"}</span>` +
      (s.bombs > 0 ? ` <span style="color:#ff6a3c;margin-left:8px">${"✸".repeat(s.bombs)}</span>` : "");

    ui.combo.textContent = s.combo >= 3 ? `COMBO x${(1 + Math.floor(s.combo / 5) * 0.5).toFixed(1)}` : "";

    ui.powerbar.innerHTML = (s.powers || [])
      .map(([name, t]) => `<span class="pchip">${name} ${Math.ceil(t)}s</span>`)
      .join("");
  };

  // ----- buttons
  function startGame() { Audio.resume(); Audio.click(); game.start(); }
  $("playBtn").addEventListener("click", startGame);
  $("retryBtn").addEventListener("click", startGame);
  $("howBtn").addEventListener("click", () => { Audio.click(); ui.menu.classList.add("hidden"); ui.how.classList.remove("hidden"); });
  $("howBack").addEventListener("click", () => { Audio.click(); ui.how.classList.add("hidden"); ui.menu.classList.remove("hidden"); });
  $("resumeBtn").addEventListener("click", () => { Audio.click(); game.resume(); });
  $("quitBtn").addEventListener("click", () => { Audio.click(); game.quitToMenu(); });
  $("menuBtn").addEventListener("click", () => { Audio.click(); game.quitToMenu(); });
  ui.bombBtn.addEventListener("click", (e) => { e.preventDefault(); game.useBomb(); });

  // first user gesture unlocks audio on mobile
  window.addEventListener("pointerdown", () => Audio.resume(), { once: true });

  // pause via keyboard
  function tickInput() {
    if (Input.consumePause()) {
      if (game.state === Game.STATE.PLAYING) game.pause();
      else if (game.state === Game.STATE.PAUSED) game.resume();
    }
  }

  // initial UI
  showOnly(Game.STATE.MENU);

  // ----- main loop
  function loop(now) {
    tickInput();
    game.frame(now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Pause automatically when tab loses focus mid-game
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.state === Game.STATE.PLAYING) game.pause();
  });
})();
