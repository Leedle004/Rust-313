const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreNode = document.querySelector("#score");
const livesNode = document.querySelector("#lives");
const waveNode = document.querySelector("#wave");
const statusLine = document.querySelector("#status-line");
const overlay = document.querySelector("#overlay");
const startButton = document.querySelector("#start-button");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();

const state = {
  running: false,
  paused: false,
  gameOver: false,
  score: 0,
  lives: 3,
  wave: 1,
  spawnTimer: 0,
  spawnInterval: 1.15,
  lastFrame: 0,
};

const player = {
  x: WIDTH / 2,
  y: HEIGHT - 78,
  radius: 18,
  speed: 410,
  cooldown: 0,
  invincible: 0,
};

const bullets = [];
const enemies = [];
const particles = [];
const stars = Array.from({ length: 110 }, () => createStar(true));

let pointerTarget = null;

function createStar(randomY = false) {
  return {
    x: Math.random() * WIDTH,
    y: randomY ? Math.random() * HEIGHT : -8,
    radius: Math.random() * 1.6 + 0.3,
    speed: Math.random() * 36 + 14,
    alpha: Math.random() * 0.65 + 0.25,
  };
}

function resetGame() {
  state.running = true;
  state.paused = false;
  state.gameOver = false;
  state.score = 0;
  state.lives = 3;
  state.wave = 1;
  state.spawnTimer = 0.8;
  state.spawnInterval = 1.15;

  player.x = WIDTH / 2;
  player.y = HEIGHT - 78;
  player.cooldown = 0;
  player.invincible = 1.1;

  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  pointerTarget = null;

  updateHud();
  setStatus("战斗开始：击落敌机并躲避撞击。");
  setOverlay(false);
}

function updateHud() {
  scoreNode.textContent = state.score.toString();
  livesNode.textContent = state.lives.toString();
  waveNode.textContent = state.wave.toString();
}

function setStatus(message) {
  statusLine.textContent = message;
}

function setOverlay(visible, title = "", message = "", buttonText = "开始游戏") {
  overlay.classList.toggle("hidden", !visible);

  if (!visible) {
    return;
  }

  overlay.querySelector("h2").textContent = title;
  overlay.querySelector("p").textContent = message;
  startButton.textContent = buttonText;
}

function togglePause() {
  if (!state.running || state.gameOver) {
    return;
  }

  state.paused = !state.paused;
  if (state.paused) {
    setStatus("已暂停：按 P 继续。");
    setOverlay(true, "游戏暂停", "按 P 或点击按钮继续战斗。", "继续游戏");
  } else {
    setStatus("继续战斗。");
    setOverlay(false);
  }
}

function endGame() {
  state.running = false;
  state.paused = false;
  state.gameOver = true;
  setStatus(`防线失守：最终分数 ${state.score}。按 R 重新开始。`);
  setOverlay(true, "任务结束", `最终分数：${state.score}`, "重新开始");
}

function shoot() {
  if (player.cooldown > 0 || !state.running || state.paused) {
    return;
  }

  bullets.push({
    x: player.x,
    y: player.y - player.radius,
    vy: -620,
    radius: 4,
    life: 1.4,
  });
  player.cooldown = Math.max(0.12, 0.22 - state.wave * 0.01);
}

function spawnEnemy() {
  const wave = state.wave;
  const roll = Math.random();
  const isBrute = wave >= 3 && roll > 0.78;
  const isZigzag = wave >= 2 && !isBrute && roll > 0.52;
  const radius = isBrute ? 26 : isZigzag ? 18 : 16;

  enemies.push({
    type: isBrute ? "brute" : isZigzag ? "zigzag" : "scout",
    x: radius + Math.random() * (WIDTH - radius * 2),
    y: -radius - Math.random() * 40,
    vx: isZigzag ? (Math.random() > 0.5 ? 1 : -1) * (70 + wave * 7) : 0,
    vy: (isBrute ? 66 : 96) + wave * 10 + Math.random() * 24,
    radius,
    hp: isBrute ? 3 : 1,
    score: isBrute ? 55 : isZigzag ? 35 : 25,
    phase: Math.random() * Math.PI * 2,
  });
}

function addBurst(x, y, color, amount = 14) {
  for (let index = 0; index < amount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 180 + 50;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 3 + 1,
      life: Math.random() * 0.45 + 0.25,
      maxLife: 0.7,
      color,
    });
  }
}

function damagePlayer() {
  if (player.invincible > 0 || state.gameOver) {
    return;
  }

  state.lives -= 1;
  player.invincible = 1.4;
  addBurst(player.x, player.y, "#61dafb", 26);
  updateHud();

  if (state.lives <= 0) {
    endGame();
  } else {
    setStatus(`护盾受损：剩余生命 ${state.lives}。`);
  }
}

function update(delta) {
  updateStars(delta);

  if (!state.running || state.paused) {
    updateParticles(delta);
    return;
  }

  state.wave = Math.floor(state.score / 300) + 1;
  state.spawnInterval = Math.max(0.34, 1.15 - state.wave * 0.07);

  player.cooldown = Math.max(0, player.cooldown - delta);
  player.invincible = Math.max(0, player.invincible - delta);

  updatePlayer(delta);
  updateBullets(delta);
  updateEnemies(delta);
  updateParticles(delta);
  handleCollisions();
  updateHud();

  state.spawnTimer -= delta;
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = state.spawnInterval * (0.65 + Math.random() * 0.7);
  }

  if (keys.has(" ") || keys.has("space")) {
    shoot();
  }
}

function updateStars(delta) {
  for (const star of stars) {
    star.y += star.speed * delta;
    if (star.y > HEIGHT + 4) {
      Object.assign(star, createStar(false));
    }
  }
}

function updatePlayer(delta) {
  let moveX = 0;
  let moveY = 0;

  if (keys.has("arrowleft") || keys.has("a")) moveX -= 1;
  if (keys.has("arrowright") || keys.has("d")) moveX += 1;
  if (keys.has("arrowup") || keys.has("w")) moveY -= 1;
  if (keys.has("arrowdown") || keys.has("s")) moveY += 1;

  if (moveX !== 0 || moveY !== 0) {
    const length = Math.hypot(moveX, moveY);
    player.x += (moveX / length) * player.speed * delta;
    player.y += (moveY / length) * player.speed * delta;
    pointerTarget = null;
  } else if (pointerTarget) {
    const dx = pointerTarget.x - player.x;
    const dy = pointerTarget.y - player.y;
    const distance = Math.hypot(dx, dy);
    const step = Math.min(distance, player.speed * 1.25 * delta);

    if (distance > 1) {
      player.x += (dx / distance) * step;
      player.y += (dy / distance) * step;
    }
  }

  player.x = clamp(player.x, player.radius, WIDTH - player.radius);
  player.y = clamp(player.y, HEIGHT * 0.45, HEIGHT - player.radius - 12);
}

function updateBullets(delta) {
  for (let index = bullets.length - 1; index >= 0; index -= 1) {
    const bullet = bullets[index];
    bullet.y += bullet.vy * delta;
    bullet.life -= delta;

    if (bullet.y < -20 || bullet.life <= 0) {
      bullets.splice(index, 1);
    }
  }
}

function updateEnemies(delta) {
  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    enemy.phase += delta * 3;
    enemy.x += enemy.vx * delta;
    enemy.y += enemy.vy * delta;

    if (enemy.type === "zigzag") {
      enemy.x += Math.sin(enemy.phase) * 72 * delta;
    }

    if (enemy.x < enemy.radius || enemy.x > WIDTH - enemy.radius) {
      enemy.vx *= -1;
      enemy.x = clamp(enemy.x, enemy.radius, WIDTH - enemy.radius);
    }

    if (enemy.y > HEIGHT + enemy.radius) {
      enemies.splice(index, 1);
      damagePlayer();
    }
  }
}

function updateParticles(delta) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= 1 - delta * 1.5;
    particle.vy *= 1 - delta * 1.5;
    particle.life -= delta;

    if (particle.life <= 0) {
      particles.splice(index, 1);
    }
  }
}

function handleCollisions() {
  for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
    const enemy = enemies[enemyIndex];

    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = bullets[bulletIndex];

      if (distance(enemy, bullet) <= enemy.radius + bullet.radius) {
        bullets.splice(bulletIndex, 1);
        enemy.hp -= 1;
        addBurst(bullet.x, bullet.y, "#fef08a", 5);

        if (enemy.hp <= 0) {
          state.score += enemy.score;
          addBurst(enemy.x, enemy.y, enemy.type === "brute" ? "#ff5c7a" : "#8b5cf6");
          enemies.splice(enemyIndex, 1);
        }
        break;
      }
    }

    if (!enemies[enemyIndex]) {
      continue;
    }

    if (distance(enemy, player) <= enemy.radius + player.radius) {
      addBurst(enemy.x, enemy.y, "#ff5c7a", 18);
      enemies.splice(enemyIndex, 1);
      damagePlayer();
    }
  }
}

function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawParticles();
  drawBullets();
  drawEnemies();
  drawPlayer();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#05091c");
  gradient.addColorStop(1, "#0b1025");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(97, 218, 251, 0.08)";
  ctx.lineWidth = 1;
  for (let y = 40; y < HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.invincible > 0 && Math.floor(player.invincible * 14) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }

  ctx.shadowColor = "#61dafb";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#61dafb";
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(18, 20);
  ctx.lineTo(0, 11);
  ctx.lineTo(-18, 20);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#eef4ff";
  ctx.beginPath();
  ctx.arc(0, 2, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBullets() {
  ctx.fillStyle = "#fef08a";
  ctx.shadowColor = "#fef08a";
  ctx.shadowBlur = 12;

  for (const bullet of bullets) {
    ctx.beginPath();
    ctx.roundRect(bullet.x - 3, bullet.y - 14, 6, 18, 4);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Math.sin(enemy.phase) * 0.15);

    const color = enemy.type === "brute" ? "#ff5c7a" : enemy.type === "zigzag" ? "#8b5cf6" : "#fb7185";
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;

    if (enemy.type === "brute") {
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius, 0);
      ctx.lineTo(0, enemy.radius);
      ctx.lineTo(-enemy.radius, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(5, 7, 19, 0.52)";
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function gameLoop(timestamp = 0) {
  const delta = Math.min((timestamp - state.lastFrame) / 1000 || 0, 0.033);
  state.lastFrame = timestamp;

  update(delta);
  render();
  requestAnimationFrame(gameLoop);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
  };
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
  }

  if (key === "p") {
    togglePause();
    return;
  }

  if (key === "r") {
    resetGame();
    return;
  }

  if ((key === "enter" || key === " ") && !state.running) {
    resetGame();
    return;
  }

  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.running || state.paused) {
    return;
  }
  pointerTarget = getCanvasPoint(event);
});

canvas.addEventListener("pointerdown", (event) => {
  if (!state.running || state.gameOver) {
    resetGame();
    return;
  }

  pointerTarget = getCanvasPoint(event);
  shoot();
});

startButton.addEventListener("click", () => {
  if (state.paused) {
    togglePause();
  } else {
    resetGame();
  }
});

setOverlay(true, "星际防线", "点击开始，保护基地免受入侵。", "开始游戏");
updateHud();
render();
requestAnimationFrame(gameLoop);
