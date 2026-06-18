import { Game } from "./game.js";

const $ = (id) => document.getElementById(id);

const canvas = $("game");
const game = new Game(canvas);

// Cache UI elements.
const ui = {
  hud: $("hud"),
  statusbar: $("statusbar"),
  score: $("score"),
  level: $("level"),
  lives: $("lives"),
  highscore: $("highscore"),
  shieldFill: $("shieldFill"),
  weaponName: $("weaponName"),
  startScreen: $("startScreen"),
  pauseScreen: $("pauseScreen"),
  gameOverScreen: $("gameOverScreen"),
  finalScore: $("finalScore"),
  finalHigh: $("finalHigh"),
  newRecord: $("newRecord"),
  touchControls: $("touchControls"),
};

// Floating toast for level / event announcements.
const toast = document.createElement("div");
toast.style.cssText = `
  position:absolute; top:40%; left:0; right:0; width:100%;
  font-size:26px; font-weight:800; letter-spacing:3px; color:#fff;
  text-shadow:0 0 24px rgba(56,225,255,0.8); pointer-events:none; opacity:0;
  transition:opacity .25s ease, transform .25s ease; z-index:8; text-align:center;`;
canvas.parentElement.appendChild(toast);
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.style.opacity = "1";
  toast.style.transform = "translateY(-8px)";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(0)";
  }, 1100);
}

const hearts = (n) => "♥".repeat(Math.max(0, n)) || "—";

function refreshHud(s) {
  ui.score.textContent = s.score.toLocaleString();
  ui.level.textContent = s.level;
  ui.lives.textContent = hearts(s.lives);
  ui.highscore.textContent = s.highscore.toLocaleString();
  ui.shieldFill.style.width = `${Math.round(s.shield * 100)}%`;
  ui.weaponName.textContent = s.weaponName;
}

// Wire game events to the UI.
game.on("hudUpdate", refreshHud);
game.on("toast", showToast);
game.on("pause", () => ui.pauseScreen.classList.remove("hidden"));
game.on("resume", () => ui.pauseScreen.classList.add("hidden"));
game.on("gameOver", ({ score, highscore, isRecord }) => {
  ui.finalScore.textContent = score.toLocaleString();
  ui.finalHigh.textContent = highscore.toLocaleString();
  ui.newRecord.classList.toggle("hidden", !isRecord);
  ui.gameOverScreen.classList.remove("hidden");
});

function beginGame() {
  ui.startScreen.classList.add("hidden");
  ui.gameOverScreen.classList.add("hidden");
  ui.pauseScreen.classList.add("hidden");
  ui.hud.classList.remove("hidden");
  ui.statusbar.classList.remove("hidden");
  game.start();
}

$("startBtn").addEventListener("click", beginGame);
$("restartBtn1").addEventListener("click", beginGame);
$("restartBtn2").addEventListener("click", beginGame);
$("resumeBtn").addEventListener("click", () => game.togglePause());

// Touch controls only on touch-capable devices.
const isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
if (isTouch) {
  ui.touchControls.classList.remove("hidden");
  game.input.bindTouch($("joystick"), $("joystickKnob"), $("fireBtn"));
}

// Render high score on the menu before the first game.
ui.highscore.textContent = game.highscore.toLocaleString();

game.loop();
