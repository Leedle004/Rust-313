// Bootstrap: wires DOM UI to the Game instance.
import { Game } from "./game.js";

const $ = (id) => document.getElementById(id);

const el = {
  canvas: $("game"),
  hud: $("hud"),
  score: $("score"),
  highScore: $("high-score"),
  wave: $("wave-label"),
  lives: $("lives"),
  menu: $("menu"),
  pause: $("pause"),
  gameover: $("gameover"),
  finalScore: $("final-score"),
  finalWave: $("final-wave"),
  finalHigh: $("final-high"),
};

const ui = {
  setScore(v) {
    el.score.textContent = v.toLocaleString();
  },
  setHighScore(v) {
    el.highScore.textContent = v.toLocaleString();
  },
  setWave(v) {
    el.wave.textContent = `第 ${v} 波`;
    el.wave.animate(
      [{ transform: "scale(1.4)", opacity: 0.4 }, { transform: "scale(1)", opacity: 0.9 }],
      { duration: 400, easing: "ease-out" }
    );
  },
  setLives(n) {
    el.lives.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const d = document.createElement("div");
      d.className = "life-icon";
      el.lives.appendChild(d);
    }
  },
  showHUD() {
    el.hud.classList.remove("hidden");
  },
  hideOverlays() {
    el.menu.classList.add("hidden");
    el.pause.classList.add("hidden");
    el.gameover.classList.add("hidden");
  },
  showPause() {
    el.pause.classList.remove("hidden");
  },
  hidePause() {
    el.pause.classList.add("hidden");
  },
  showGameOver(score, wave, high) {
    el.finalScore.textContent = score.toLocaleString();
    el.finalWave.textContent = wave;
    el.finalHigh.textContent = high.toLocaleString();
    el.gameover.classList.remove("hidden");
  },
};

const game = new Game(el.canvas, ui);

// ---- Button wiring ----
$("start-btn").addEventListener("click", () => game.start());
$("again-btn").addEventListener("click", () => game.start());
$("resume-btn").addEventListener("click", () => game.resume());
$("restart-btn").addEventListener("click", () => game.start());
$("pause-btn").addEventListener("click", () => game.togglePause());

// Prevent context menu / scroll interfering with gameplay.
window.addEventListener("contextmenu", (e) => {
  if (e.target === el.canvas) e.preventDefault();
});
