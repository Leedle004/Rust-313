const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const livesEl = document.querySelector("#lives");
const waveEl = document.querySelector("#wave");
const bestScoreEl = document.querySelector("#bestScore");
const statusTextEl = document.querySelector("#statusText");
const overlayEl = document.querySelector("#overlay");
const overlayTitleEl = document.querySelector("#overlayTitle");
const overlayMessageEl = document.querySelector("#overlayMessage");
const startButton = document.querySelector("#startButton");

const WORLD = {
  width: canvas.width,
  height: canvas.height,
};

const keys = new Set();
const pointer = {
  x: WORLD.width / 2,
  y: WORLD.height * 0.35,
  firing: false,
};

let player = createPlayer();
let bullets = [];
let enemies = [];
let particles = [];
let powerups = [];
let lastFrame = performance.now();

const state = {
  mode: "start",
  score: 0,
  lives: 3,
  wave: 1,
  elapsed: 0,
  spawnTimer: 0.9,
  shake: 0,
  best: readBestScore(),
};

const stars = Array.from({ length: 120 }, () => createStar(true));

function createPlayer() {
  return {
    x: WORLD.width / 2,
    y: WORLD.height - 82,
    radius: 18,
    speed: 300,
    cooldown: 0,
    invulnerable: 0,
    rapidFire: 0,
  };
}

function createStar(randomY = false) {
  return {
    x: Math.random() * WORLD.width,
    y: randomY ? Math.random() * WORLD.height : -8,
    size: Math.random() * 2.2 + 0.4,
    speed: Math.random() * 38 + 18,
    alpha: Math.random() * 0.6 + 0.25,
  };
}

function readBestScore() {
  try {
    return Number(localStorage.getItem("star-breakout-best") || 0);
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    localStorage.setItem("star-breakout-best", String(score));
  } catch {
    // Storage can be disabled in private browsing modes; the game remains playable.
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * WORLD.width;
  pointer.y = ((event.clientY - rect.top) / rect.height) * WORLD.height;
}

function setOverlay(title, message, buttonText) {
  overlayTitleEl.textContent = title;
  overlayMessageEl.textContent = message;
  startButton.textContent = buttonText;
  overlayEl.classList.remove("hidden");
}

function hideOverlay() {
  overlayEl.classList.add("hidden");
}

function startGame() {
  player = createPlayer();
  bullets = [];
  enemies = [];
  particles = [];
  powerups = [];

  state.mode = "running";
  state.score = 0;
  state.lives = 3;
  state.wave = 1;
  state.elapsed = 0;
  state.spawnTimer = 0.65;
  state.shake = 0;

  pointer.x = player.x;
  pointer.y = player.y - 140;
  hideOverlay();
  updateHud();
}

function endGame() {
  state.mode = "gameover";
  if (state.score > state.best) {
    state.best = state.score;
    saveBestScore(state.best);
  }

  setOverlay(
    "任务结束",
    `最终分数 ${state.score}。击毁更多敌机可以提升波次和节奏。`,
    "再来一局",
  );
  updateHud();
}

function togglePause() {
  if (state.mode === "running") {
    state.mode = "paused";
    setOverlay("已暂停", "按 P 继续，或点击按钮重新开始。", "重新开始");
  } else if (state.mode === "paused") {
    state.mode = "running";
    hideOverlay();
  }
  updateHud();
}

function shoot() {
  if (state.mode !== "running" || player.cooldown > 0) {
    return;
  }

  const angle = Math.atan2(pointer.y - player.y, pointer.x - player.x);
  const spread = player.rapidFire > 0 ? [-0.15, 0, 0.15] : [0];

  for (const offset of spread) {
    const shotAngle = angle + offset;
    bullets.push({
      x: player.x + Math.cos(shotAngle) * 22,
      y: player.y + Math.sin(shotAngle) * 22,
      vx: Math.cos(shotAngle) * 620,
      vy: Math.sin(shotAngle) * 620,
      radius: 4,
      damage: 1,
      life: 1.25,
    });
  }

  player.cooldown = player.rapidFire > 0 ? 0.1 : 0.18;
  spawnParticles(player.x, player.y, "#62e6ff", 5, 90);
}

function spawnEnemy() {
  const waveBoost = state.wave - 1;
  const roll = Math.random();
  const type =
    state.wave >= 4 && roll > 0.78
      ? "brute"
      : state.wave >= 2 && roll > 0.56
        ? "scout"
        : "drone";

  const stats = {
    drone: {
      radius: 16,
      hp: 1,
      speed: 78 + waveBoost * 5,
      score: 100,
      color: "#ff5470",
    },
    scout: {
      radius: 12,
      hp: 1,
      speed: 128 + waveBoost * 6,
      score: 140,
      color: "#ffd166",
    },
    brute: {
      radius: 25,
      hp: 3,
      speed: 58 + waveBoost * 4,
      score: 320,
      color: "#7c5cff",
    },
  }[type];

  const side = Math.floor(Math.random() * 3);
  let x = Math.random() * WORLD.width;
  let y = -stats.radius - 20;

  if (side === 1) {
    x = -stats.radius - 20;
    y = Math.random() * WORLD.height * 0.65;
  } else if (side === 2) {
    x = WORLD.width + stats.radius + 20;
    y = Math.random() * WORLD.height * 0.65;
  }

  enemies.push({
    ...stats,
    x,
    y,
    type,
    maxHp: stats.hp,
    wobble: Math.random() * Math.PI * 2,
  });
}

function spawnPowerup(x, y) {
  const kind = Math.random() > 0.45 ? "rapid" : "repair";
  powerups.push({
    x,
    y,
    kind,
    radius: 13,
    vy: 44,
    life: 8,
  });
}

function spawnParticles(x, y, color, count = 10, speed = 160) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * speed + speed * 0.25;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      color,
      radius: Math.random() * 3 + 1,
      life: Math.random() * 0.45 + 0.25,
      maxLife: 0.7,
    });
  }
}

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  waveEl.textContent = state.wave;
  bestScoreEl.textContent = state.best;

  const labels = {
    start: "准备开始",
    running: player.rapidFire > 0 ? "火力强化" : "战斗中",
    paused: "已暂停",
    gameover: "任务结束",
  };
  statusTextEl.textContent = labels[state.mode];
}

function updateStars(dt) {
  for (const star of stars) {
    star.y += star.speed * dt;
    if (star.y > WORLD.height + 8) {
      Object.assign(star, createStar(false));
    }
  }
}

function updatePlayer(dt) {
  let dx = 0;
  let dy = 0;

  if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    player.x += (dx / length) * player.speed * dt;
    player.y += (dy / length) * player.speed * dt;
  }

  player.x = clamp(player.x, player.radius, WORLD.width - player.radius);
  player.y = clamp(player.y, WORLD.height * 0.2, WORLD.height - player.radius);
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.rapidFire = Math.max(0, player.rapidFire - dt);

  if (pointer.firing) {
    shoot();
  }
}

function updateBullets(dt) {
  for (let index = bullets.length - 1; index >= 0; index -= 1) {
    const bullet = bullets[index];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    const outOfBounds =
      bullet.x < -40 ||
      bullet.x > WORLD.width + 40 ||
      bullet.y < -40 ||
      bullet.y > WORLD.height + 40;

    if (bullet.life <= 0 || outOfBounds) {
      bullets.splice(index, 1);
    }
  }
}

function updateEnemies(dt) {
  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const drift = Math.sin(state.elapsed * 3 + enemy.wobble) * 18;

    enemy.x += Math.cos(angle) * enemy.speed * dt + drift * dt;
    enemy.y += Math.sin(angle) * enemy.speed * dt;

    if (distance(player, enemy) < player.radius + enemy.radius) {
      enemies.splice(index, 1);
      damagePlayer();
      spawnParticles(enemy.x, enemy.y, enemy.color, 18, 210);
    }
  }
}

function updatePowerups(dt) {
  for (let index = powerups.length - 1; index >= 0; index -= 1) {
    const powerup = powerups[index];
    powerup.y += powerup.vy * dt;
    powerup.life -= dt;

    if (distance(player, powerup) < player.radius + powerup.radius) {
      if (powerup.kind === "repair") {
        state.lives = Math.min(5, state.lives + 1);
        spawnParticles(powerup.x, powerup.y, "#35f28f", 18, 170);
      } else {
        player.rapidFire = 6;
        spawnParticles(powerup.x, powerup.y, "#62e6ff", 18, 170);
      }
      powerups.splice(index, 1);
      continue;
    }

    if (powerup.life <= 0 || powerup.y > WORLD.height + 30) {
      powerups.splice(index, 1);
    }
  }
}

function updateParticles(dt) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.985;
    particle.vy *= 0.985;
    particle.life -= dt;

    if (particle.life <= 0) {
      particles.splice(index, 1);
    }
  }
}

function damagePlayer() {
  if (player.invulnerable > 0) {
    return;
  }

  state.lives -= 1;
  state.shake = 13;
  player.invulnerable = 1.4;
  spawnParticles(player.x, player.y, "#ff5470", 26, 260);

  if (state.lives <= 0) {
    endGame();
  }
}

function resolveBulletHits() {
  for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    const bullet = bullets[bulletIndex];

    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = enemies[enemyIndex];
      if (distance(bullet, enemy) >= bullet.radius + enemy.radius) {
        continue;
      }

      bullets.splice(bulletIndex, 1);
      enemy.hp -= bullet.damage;
      spawnParticles(bullet.x, bullet.y, enemy.color, 6, 130);

      if (enemy.hp <= 0) {
        enemies.splice(enemyIndex, 1);
        state.score += enemy.score;
        state.shake = Math.max(state.shake, enemy.type === "brute" ? 8 : 4);
        spawnParticles(enemy.x, enemy.y, enemy.color, enemy.type === "brute" ? 34 : 18, 230);

        if (Math.random() < 0.12) {
          spawnPowerup(enemy.x, enemy.y);
        }
      }

      break;
    }
  }
}

function update(dt) {
  updateStars(dt * (state.mode === "running" ? 1 : 0.35));

  if (state.mode !== "running") {
    updateParticles(dt);
    return;
  }

  state.elapsed += dt;
  state.wave = 1 + Math.floor(state.score / 1200) + Math.floor(state.elapsed / 45);
  state.spawnTimer -= dt;
  state.shake = Math.max(0, state.shake - 42 * dt);

  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updatePowerups(dt);
  resolveBulletHits();
  updateParticles(dt);

  if (state.spawnTimer <= 0) {
    spawnEnemy();
    if (state.wave >= 5 && Math.random() > 0.68) {
      spawnEnemy();
    }
    state.spawnTimer = Math.max(0.26, 1.08 - state.wave * 0.065) * (0.78 + Math.random() * 0.48);
  }

  if (state.score > state.best) {
    state.best = state.score;
  }

  updateHud();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  gradient.addColorStop(0, "#04081a");
  gradient.addColorStop(1, "#070b18");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(98, 230, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let y = 40; y < WORLD.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  const angle = Math.atan2(pointer.y - player.y, pointer.x - player.x);

  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) {
    ctx.globalAlpha = 0.38;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(angle);

  ctx.fillStyle = "#62e6ff";
  ctx.strokeStyle = "#e9fbff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(-17, -15);
  ctx.lineTo(-10, 0);
  ctx.lineTo(-17, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#7c5cff";
  ctx.beginPath();
  ctx.moveTo(-18, -8);
  ctx.lineTo(-31, 0);
  ctx.lineTo(-18, 8);
  ctx.fill();

  ctx.restore();
  ctx.globalAlpha = 1;

  if (player.rapidFire > 0) {
    ctx.strokeStyle = "rgba(98, 230, 255, 0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBullets() {
  for (const bullet of bullets) {
    ctx.fillStyle = "#c5f7ff";
    ctx.shadowColor = "#62e6ff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.fillStyle = enemy.color;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    if (enemy.type === "scout") {
      ctx.moveTo(enemy.x, enemy.y - enemy.radius);
      ctx.lineTo(enemy.x + enemy.radius, enemy.y + enemy.radius);
      ctx.lineTo(enemy.x - enemy.radius, enemy.y + enemy.radius);
      ctx.closePath();
    } else {
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    if (enemy.maxHp > 1) {
      const width = enemy.radius * 1.7;
      const hpRatio = enemy.hp / enemy.maxHp;
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 10, width, 4);
      ctx.fillStyle = "#35f28f";
      ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 10, width * hpRatio, 4);
    }
  }
}

function drawPowerups() {
  for (const powerup of powerups) {
    const color = powerup.kind === "repair" ? "#35f28f" : "#62e6ff";
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(powerup.x, powerup.y, powerup.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#04101b";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(powerup.kind === "repair" ? "+" : "x", powerup.x, powerup.y + 1);
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCrosshair() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.52)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(pointer.x, pointer.y, 12, 0, Math.PI * 2);
  ctx.moveTo(pointer.x - 18, pointer.y);
  ctx.lineTo(pointer.x - 7, pointer.y);
  ctx.moveTo(pointer.x + 7, pointer.y);
  ctx.lineTo(pointer.x + 18, pointer.y);
  ctx.moveTo(pointer.x, pointer.y - 18);
  ctx.lineTo(pointer.x, pointer.y - 7);
  ctx.moveTo(pointer.x, pointer.y + 7);
  ctx.lineTo(pointer.x, pointer.y + 18);
  ctx.stroke();
}

function draw() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }

  drawBackground();
  drawPowerups();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawCrosshair();

  ctx.restore();
}

function gameLoop(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;

  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const handledCodes = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Space",
  ];
  if (handledCodes.includes(event.code)) {
    event.preventDefault();
  }

  keys.add(event.code);

  if (event.code === "Space") {
    if (state.mode === "start" || state.mode === "gameover") {
      startGame();
    }
    pointer.firing = true;
    shoot();
  }

  if (event.code === "KeyP") {
    togglePause();
  }

  if (event.code === "KeyR") {
    startGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  if (event.code === "Space") {
    pointer.firing = false;
  }
});

canvas.addEventListener("pointermove", updatePointer);
canvas.addEventListener("pointerdown", (event) => {
  updatePointer(event);
  pointer.firing = true;
  canvas.setPointerCapture(event.pointerId);
  shoot();
});

canvas.addEventListener("pointerup", (event) => {
  pointer.firing = false;
  canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener("pointerleave", () => {
  pointer.firing = false;
});

startButton.addEventListener("click", () => {
  startGame();
});

updateHud();
draw();
requestAnimationFrame(gameLoop);
