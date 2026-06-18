const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const waveEl = document.querySelector("#wave");
const healthFill = document.querySelector("#healthFill");
const overlay = document.querySelector("#overlay");
const overlayText = document.querySelector("#overlayText");
const startButton = document.querySelector("#startButton");

const TWO_PI = Math.PI * 2;
const keys = new Set();

const state = {
  status: "idle",
  width: 0,
  height: 0,
  dpr: 1,
  score: 0,
  wave: 1,
  nextWaveScore: 900,
  spawnTimer: 0,
  spawnDelay: 1.2,
  shake: 0,
  lastTime: 0,
  player: null,
  pointer: {
    x: 0,
    y: 0,
    down: false,
    active: false,
  },
  bullets: [],
  enemies: [],
  particles: [],
  stars: [],
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  state.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  state.width = rect.width;
  state.height = rect.height;
  canvas.width = Math.floor(rect.width * state.dpr);
  canvas.height = Math.floor(rect.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

  state.pointer.x = state.pointer.x || state.width / 2;
  state.pointer.y = state.pointer.y || state.height * 0.3;

  if (state.player) {
    state.player.x = clamp(state.player.x, 28, state.width - 28);
    state.player.y = clamp(state.player.y, 28, state.height - 28);
  }

  createStars();
}

function createStars() {
  const count = Math.max(80, Math.floor((state.width * state.height) / 9000));
  state.stars = Array.from({ length: count }, () => ({
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    radius: randomBetween(0.6, 1.9),
    speed: randomBetween(18, 76),
    alpha: randomBetween(0.28, 0.9),
  }));
}

function createPlayer() {
  return {
    x: state.width / 2,
    y: state.height * 0.72,
    radius: 18,
    angle: -Math.PI / 2,
    speed: 330,
    fireCooldown: 0,
    invulnerable: 1.5,
    maxHealth: 100,
    health: 100,
  };
}

function resetGame() {
  state.status = "playing";
  state.score = 0;
  state.wave = 1;
  state.nextWaveScore = 900;
  state.spawnTimer = 0.2;
  state.spawnDelay = 1.2;
  state.shake = 0;
  state.player = createPlayer();
  state.bullets = [];
  state.enemies = [];
  state.particles = [];
  updateHud();
  hideOverlay();
}

function showOverlay(title, buttonText, message) {
  overlay.classList.remove("hidden");
  overlay.querySelector("h1").textContent = title;
  overlayText.textContent = message;
  startButton.textContent = buttonText;
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function updateHud() {
  const healthRatio = state.player
    ? clamp(state.player.health / state.player.maxHealth, 0, 1)
    : 1;
  scoreEl.textContent = Math.floor(state.score).toLocaleString();
  waveEl.textContent = String(state.wave);
  healthFill.style.transform = `scaleX(${healthRatio})`;
  healthFill.style.boxShadow =
    healthRatio < 0.35
      ? "0 0 18px rgba(255, 88, 118, 0.62)"
      : "0 0 18px rgba(69, 240, 166, 0.58)";
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  state.pointer.x = event.clientX - rect.left;
  state.pointer.y = event.clientY - rect.top;
  state.pointer.active = true;
}

function spawnBullet() {
  const player = state.player;
  if (!player || player.fireCooldown > 0) return;

  let dx = state.pointer.x - player.x;
  let dy = state.pointer.y - player.y;
  if (!state.pointer.active || Math.hypot(dx, dy) < 6) {
    dx = Math.cos(player.angle);
    dy = Math.sin(player.angle);
  }

  const length = Math.hypot(dx, dy) || 1;
  const nx = dx / length;
  const ny = dy / length;
  player.angle = Math.atan2(ny, nx);
  player.fireCooldown = 0.13;

  state.bullets.push({
    x: player.x + nx * (player.radius + 12),
    y: player.y + ny * (player.radius + 12),
    vx: nx * 780,
    vy: ny * 780,
    radius: 5,
    damage: 24,
    life: 0.85,
    color: "#8df8ff",
  });

  addParticles(player.x + nx * 26, player.y + ny * 26, "#8df8ff", 4, 120);
}

function chooseEnemyType() {
  const roll = Math.random();
  if (state.wave >= 4 && roll > 0.82) {
    return {
      kind: "brute",
      radius: 29,
      speed: 62 + state.wave * 2.6,
      health: 92 + state.wave * 7,
      score: 180,
      color: "#ffb04f",
    };
  }
  if (state.wave >= 2 && roll > 0.58) {
    return {
      kind: "skimmer",
      radius: 15,
      speed: 132 + state.wave * 5,
      health: 24 + state.wave * 3,
      score: 110,
      color: "#c57dff",
    };
  }
  return {
    kind: "drone",
    radius: 20,
    speed: 86 + state.wave * 4,
    health: 42 + state.wave * 4,
    score: 80,
    color: "#ff5d84",
  };
}

function spawnEnemy() {
  const enemy = chooseEnemyType();
  const side = Math.floor(Math.random() * 4);
  const margin = 64;

  if (side === 0) {
    enemy.x = randomBetween(-margin, state.width + margin);
    enemy.y = -margin;
  } else if (side === 1) {
    enemy.x = state.width + margin;
    enemy.y = randomBetween(-margin, state.height + margin);
  } else if (side === 2) {
    enemy.x = randomBetween(-margin, state.width + margin);
    enemy.y = state.height + margin;
  } else {
    enemy.x = -margin;
    enemy.y = randomBetween(-margin, state.height + margin);
  }

  enemy.maxHealth = enemy.health;
  enemy.wobble = Math.random() * TWO_PI;
  state.enemies.push(enemy);
}

function addParticles(x, y, color, count, speed = 180) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * TWO_PI;
    const velocity = randomBetween(speed * 0.28, speed);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      radius: randomBetween(1.4, 4.2),
      life: randomBetween(0.25, 0.72),
      maxLife: 0.72,
      color,
    });
  }
}

function updateStars(dt) {
  for (const star of state.stars) {
    star.y += star.speed * dt;
    if (star.y > state.height + 8) {
      star.x = Math.random() * state.width;
      star.y = -8;
      star.speed = randomBetween(18, 76);
    }
  }
}

function updatePlayer(dt) {
  const player = state.player;
  let moveX = 0;
  let moveY = 0;

  if (keys.has("KeyA") || keys.has("ArrowLeft")) moveX -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) moveX += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) moveY -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) moveY += 1;

  const length = Math.hypot(moveX, moveY) || 1;
  player.x += (moveX / length) * player.speed * dt;
  player.y += (moveY / length) * player.speed * dt;
  player.x = clamp(player.x, player.radius + 8, state.width - player.radius - 8);
  player.y = clamp(player.y, player.radius + 8, state.height - player.radius - 8);

  if (state.pointer.active) {
    player.angle = Math.atan2(state.pointer.y - player.y, state.pointer.x - player.x);
  }

  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);

  if (state.pointer.down || keys.has("Space")) {
    spawnBullet();
  }
}

function updateBullets(dt) {
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  }

  state.bullets = state.bullets.filter(
    (bullet) =>
      bullet.life > 0 &&
      bullet.x > -40 &&
      bullet.x < state.width + 40 &&
      bullet.y > -40 &&
      bullet.y < state.height + 40,
  );
}

function updateEnemies(dt) {
  const player = state.player;
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnDelay = Math.max(0.34, 1.25 - state.wave * 0.07);
    state.spawnTimer = state.spawnDelay * randomBetween(0.72, 1.18);
  }

  for (const enemy of state.enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const length = Math.hypot(dx, dy) || 1;
    const wobble = Math.sin(performance.now() / 420 + enemy.wobble) * 0.42;
    const nx = dx / length;
    const ny = dy / length;
    enemy.x += (nx * Math.cos(wobble) - ny * Math.sin(wobble)) * enemy.speed * dt;
    enemy.y += (ny * Math.cos(wobble) + nx * Math.sin(wobble)) * enemy.speed * dt;
  }
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 1 - 2.8 * dt;
    particle.vy *= 1 - 2.8 * dt;
    particle.life -= dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function handleCollisions() {
  const player = state.player;
  const deadEnemies = new Set();
  const spentBullets = new Set();

  for (const bullet of state.bullets) {
    for (const enemy of state.enemies) {
      if (deadEnemies.has(enemy)) continue;
      const radius = bullet.radius + enemy.radius;
      if (distanceSquared(bullet, enemy) <= radius * radius) {
        spentBullets.add(bullet);
        enemy.health -= bullet.damage;
        addParticles(bullet.x, bullet.y, enemy.color, 5, 160);
        if (enemy.health <= 0) {
          deadEnemies.add(enemy);
          state.score += enemy.score + state.wave * 9;
          state.shake = Math.min(10, state.shake + 3.5);
          addParticles(enemy.x, enemy.y, enemy.color, enemy.kind === "brute" ? 24 : 14, 260);
        }
        break;
      }
    }
  }

  for (const enemy of state.enemies) {
    if (deadEnemies.has(enemy)) continue;
    const radius = player.radius + enemy.radius;
    if (distanceSquared(player, enemy) <= radius * radius) {
      deadEnemies.add(enemy);
      if (player.invulnerable <= 0) {
        const damage = enemy.kind === "brute" ? 28 : 18;
        player.health -= damage;
        player.invulnerable = 0.85;
        state.shake = 12;
        addParticles(player.x, player.y, "#ffffff", 20, 320);
      }
    }
  }

  state.bullets = state.bullets.filter((bullet) => !spentBullets.has(bullet));
  state.enemies = state.enemies.filter((enemy) => !deadEnemies.has(enemy));

  if (state.score >= state.nextWaveScore) {
    state.wave += 1;
    state.nextWaveScore += 900 + state.wave * 350;
    state.player.health = Math.min(state.player.maxHealth, state.player.health + 16);
    addParticles(state.player.x, state.player.y, "#78f8c5", 28, 280);
  }

  if (player.health <= 0) {
    endGame();
  }
}

function endGame() {
  state.status = "gameover";
  addParticles(state.player.x, state.player.y, "#ff5876", 48, 360);
  showOverlay(
    "Mission Failed",
    "Try Again",
    `Final score: ${Math.floor(state.score).toLocaleString()}. Dodge, aim, and fire to survive the next run.`,
  );
}

function togglePause() {
  if (state.status === "playing") {
    state.status = "paused";
    showOverlay("Paused", "Resume", "The swarm is waiting. Press P or resume when ready.");
  } else if (state.status === "paused") {
    state.status = "playing";
    hideOverlay();
    state.lastTime = performance.now();
  }
}

function updateGame(dt) {
  updateStars(dt);
  if (state.status !== "playing") {
    updateParticles(dt);
    return;
  }

  updatePlayer(dt);
  updateBullets(dt);
  updateEnemies(dt);
  updateParticles(dt);
  handleCollisions();
  state.shake = Math.max(0, state.shake - 26 * dt);
  updateHud();
}

function drawStars() {
  ctx.save();
  for (const star of state.stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#dce8ff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer() {
  const player = state.player;
  if (!player) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle + Math.PI / 2);

  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 18) % 2 === 0) {
    ctx.globalAlpha = 0.58;
  }

  const gradient = ctx.createLinearGradient(0, -24, 0, 28);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.42, "#8df8ff");
  gradient.addColorStop(1, "#426dff");

  ctx.fillStyle = gradient;
  ctx.shadowColor = "#69e7ff";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(17, 19);
  ctx.lineTo(0, 12);
  ctx.lineTo(-17, 19);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#07112d";
  ctx.beginPath();
  ctx.arc(0, -4, 6, 0, TWO_PI);
  ctx.fill();

  ctx.restore();
}

function drawBullets() {
  ctx.save();
  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.color;
    ctx.shadowColor = bullet.color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemies() {
  ctx.save();
  for (const enemy of state.enemies) {
    const ratio = clamp(enemy.health / enemy.maxHealth, 0, 1);

    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = enemy.color;
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = 18;

    if (enemy.kind === "skimmer") {
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius + 5, 0);
      ctx.lineTo(0, enemy.radius);
      ctx.lineTo(-enemy.radius - 5, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, TWO_PI);
      ctx.fill();
      ctx.fillStyle = "rgba(5, 8, 20, 0.72)";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.45, 0, TWO_PI);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(-enemy.radius, enemy.radius + 9, enemy.radius * 2 * ratio, 4);
    ctx.resetTransform();
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  for (const particle of state.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * alpha, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}

function drawAimLine() {
  const player = state.player;
  if (!player || state.status !== "playing") return;

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = "#8df8ff";
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(state.pointer.x, state.pointer.y);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.save();

  if (state.shake > 0) {
    ctx.translate(randomBetween(-state.shake, state.shake), randomBetween(-state.shake, state.shake));
  }

  const vignette = ctx.createRadialGradient(
    state.width / 2,
    state.height / 2,
    state.width * 0.1,
    state.width / 2,
    state.height / 2,
    Math.max(state.width, state.height) * 0.75,
  );
  vignette.addColorStop(0, "rgba(10, 18, 46, 0.14)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.32)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, state.width, state.height);

  drawStars();
  drawAimLine();
  drawBullets();
  drawEnemies();
  drawPlayer();
  drawParticles();
  ctx.restore();
}

function frame(time) {
  const dt = Math.min(0.033, (time - state.lastTime) / 1000 || 0);
  state.lastTime = time;
  updateGame(dt);
  draw();
  requestAnimationFrame(frame);
}

function handleKeyDown(event) {
  const playableKeys = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "KeyA",
    "KeyD",
    "KeyW",
    "KeyS",
    "Space",
  ];
  if (playableKeys.includes(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  }

  if (event.code === "KeyP") {
    togglePause();
  } else if (event.code === "KeyR") {
    resetGame();
  } else if (event.code === "Enter" && state.status !== "playing") {
    if (state.status === "paused") {
      togglePause();
    } else {
      resetGame();
    }
  }
}

function handleKeyUp(event) {
  keys.delete(event.code);
}

startButton.addEventListener("click", () => {
  if (state.status === "paused") {
    togglePause();
  } else {
    resetGame();
  }
});

canvas.addEventListener("pointermove", updatePointer);
canvas.addEventListener("pointerdown", (event) => {
  updatePointer(event);
  state.pointer.down = true;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointerup", () => {
  state.pointer.down = false;
});
canvas.addEventListener("pointercancel", () => {
  state.pointer.down = false;
});

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("resize", resizeCanvas);
window.addEventListener("blur", () => {
  keys.clear();
  state.pointer.down = false;
});

resizeCanvas();
showOverlay(
  "Starfall Shooter",
  "Start Mission",
  "Survive the meteor swarm, shoot enemy drones, and push your score as high as you can.",
);
requestAnimationFrame(frame);
