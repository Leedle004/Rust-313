// Entry point: wires the DOM UI to the game and runs the main loop.
(() => {
  const canvas = document.getElementById("game-canvas");

  const el = (id) => document.getElementById(id);
  const dom = {
    hud: el("hud"),
    score: el("hud-score"),
    best: el("hud-best"),
    wave: el("hud-wave"),
    lives: el("hud-lives"),
    weapon: el("hud-weapon"),
    health: el("bar-health"),
    menu: el("menu"),
    pause: el("pause"),
    gameover: el("gameover"),
    finalScore: el("final-score"),
    finalWave: el("final-wave"),
    finalBest: el("final-best"),
    newbest: el("newbest"),
    touchFire: el("touch-fire"),
  };

  const show = (n) => n.classList.remove("hidden");
  const hide = (n) => n.classList.add("hidden");

  const ui = {
    setScore: (s) => (dom.score.textContent = s),
    setBest: (s) => (dom.best.textContent = s),
    setWave: (w) => (dom.wave.textContent = w),
    setLives: (l) => (dom.lives.textContent = l),
    setWeapon: (w) => (dom.weapon.textContent = w),
    setHealth: (r) => {
      dom.health.style.width = Math.max(0, r * 100) + "%";
      dom.health.style.filter = r < 0.3 ? "hue-rotate(-40deg) saturate(1.5)" : "none";
    },
    showHUD: () => {
      show(dom.hud);
      hide(dom.menu);
      hide(dom.pause);
      hide(dom.gameover);
      ui.setScore(0);
      ui.setWeapon("单发");
      ui.setHealth(1);
      ui.setLives(3);
    },
    showMenu: () => {
      show(dom.menu);
      hide(dom.hud);
      hide(dom.pause);
      hide(dom.gameover);
    },
    showPause: () => show(dom.pause),
    hidePause: () => hide(dom.pause),
    showGameOver: (score, wave, best, isBest) => {
      dom.finalScore.textContent = score;
      dom.finalWave.textContent = wave;
      dom.finalBest.textContent = best;
      dom.best.textContent = best;
      if (isBest) show(dom.newbest);
      else hide(dom.newbest);
      show(dom.gameover);
    },
  };

  Input.init(canvas);
  const game = new Game(canvas, ui);

  // Buttons.
  const beginGame = () => {
    Sound.unlock();
    Input.clear();
    game.start();
  };
  el("btn-start").addEventListener("click", beginGame);
  el("btn-restart").addEventListener("click", beginGame);
  el("btn-resume").addEventListener("click", () => game.resume());
  el("btn-quit").addEventListener("click", () => game.toMenu());
  el("btn-menu").addEventListener("click", () => game.toMenu());

  Input.onPause(() => game.togglePause());

  // Touch fire button for mobile.
  if ("ontouchstart" in window) {
    show(dom.touchFire);
    const setFire = (v) => (e) => {
      e.preventDefault();
      Input.setFire(v);
    };
    dom.touchFire.addEventListener("touchstart", setFire(true), { passive: false });
    dom.touchFire.addEventListener("touchend", setFire(false), { passive: false });
  }

  // Main loop with delta time, capped to avoid spiral-of-death on tab switch.
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;

    game.update(dt, Input.state);
    game.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
