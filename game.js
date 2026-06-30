const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const livesEl = document.querySelector("#lives");
const timeEl = document.querySelector("#time");
const bestScoreEl = document.querySelector("#best-score");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayMessage = document.querySelector("#overlay-message");
const primaryAction = document.querySelector("#primary-action");

const WIDTH = 960;
const HEIGHT = 540;
const GAME_SECONDS = 90;
const TARGET_SCORE = 2000;
const BEST_SCORE_KEY = "data-runner-best-score";

const keys = new Set();
const shards = [];
const viruses = [];
const patches = [];
const particles = [];

const random = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const stars = Array.from({ length: 120 }, () => ({
  x: Math.random() * WIDTH,
  y: Math.random() * HEIGHT,
  size: random(0.6, 2.2),
  alpha: random(0.22, 0.9),
}));

const player = {
  x: WIDTH / 2,
  y: HEIGHT / 2,
  radius: 18,
  speed: 295,
  invulnerable: 0,
  shield: 0,
};

const game = {
  state: "idle",
  score: 0,
  lives: 3,
  timeLeft: GAME_SECONDS,
  elapsed: 0,
  lastFrame: 0,
  shardTimer: 0,
  virusTimer: 0,
  patchTimer: 5,
  pointerTarget: null,
  bestScore: Number(localStorage.getItem(BEST_SCORE_KEY) || 0),
};

function setCanvasScale() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = WIDTH * dpr;
  canvas.height = HEIGHT * dpr;
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resetGame() {
  shards.length = 0;
  viruses.length = 0;
  patches.length = 0;
  particles.length = 0;
  Object.assign(player, {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    invulnerable: 1.2,
    shield: 0,
  });
  Object.assign(game, {
    state: "running",
    score: 0,
    lives: 3,
    timeLeft: GAME_SECONDS,
    elapsed: 0,
    lastFrame: 0,
    shardTimer: 0,
    virusTimer: 0.4,
    patchTimer: 8,
    pointerTarget: null,
  });

  for (let i = 0; i < 8; i += 1) {
    spawnShard();
  }
  for (let i = 0; i < 3; i += 1) {
    spawnVirus();
  }

  hideOverlay();
  updateHud();
}

function hideOverlay() {
  overlay.hidden = true;
}

function showOverlay(title, message, actionLabel = "再来一局") {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  primaryAction.textContent = actionLabel;
  overlay.hidden = false;
}

function updateHud() {
  scoreEl.textContent = game.score.toString();
  livesEl.textContent = game.lives.toString();
  timeEl.textContent = Math.ceil(game.timeLeft).toString();
  bestScoreEl.textContent = game.bestScore.toString();
}

function spawnShard() {
  const highValue = Math.random() > 0.82;
  shards.push({
    x: random(34, WIDTH - 34),
    y: random(34, HEIGHT - 34),
    radius: highValue ? 13 : 10,
    value: highValue ? 125 : 50,
    pulse: random(0, Math.PI * 2),
  });
}

function spawnVirus() {
  const edge = Math.floor(random(0, 4));
  const speed = random(82, 126) + game.elapsed * 1.9;
  const virus = {
    x: edge === 0 ? -26 : edge === 1 ? WIDTH + 26 : random(0, WIDTH),
    y: edge === 2 ? -26 : edge === 3 ? HEIGHT + 26 : random(0, HEIGHT),
    radius: random(16, 24),
    vx: 0,
    vy: 0,
    spin: random(-3, 3),
    angle: random(0, Math.PI * 2),
  };
  const angle = Math.atan2(player.y - virus.y, player.x - virus.x) + random(-0.55, 0.55);
  virus.vx = Math.cos(angle) * speed;
  virus.vy = Math.sin(angle) * speed;
  viruses.push(virus);
}

function spawnPatch() {
  patches.push({
    x: random(46, WIDTH - 46),
    y: random(46, HEIGHT - 46),
    radius: 15,
    ttl: 9,
    pulse: random(0, Math.PI * 2),
  });
}

function burst(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i += 1) {
    const angle = random(0, Math.PI * 2);
    const speed = random(38, 170);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: random(0.35, 0.8),
      maxLife: 0.8,
      color,
      radius: random(1.5, 4),
    });
  }
}

function update(delta) {
  if (game.state !== "running") {
    return;
  }

  game.elapsed += delta;
  game.timeLeft -= delta;
  player.invulnerable = Math.max(0, player.invulnerable - delta);
  player.shield = Math.max(0, player.shield - delta);
  updatePlayer(delta);
  updateSpawners(delta);
  updateViruses(delta);
  updateCollectibles(delta);
  updateParticles(delta);
  updateHud();

  if (game.score >= TARGET_SCORE) {
    finishGame(true);
  } else if (game.timeLeft <= 0) {
    finishGame(false);
  }
}

function updatePlayer(delta) {
  let axisX = 0;
  let axisY = 0;

  if (keys.has("arrowleft") || keys.has("a")) axisX -= 1;
  if (keys.has("arrowright") || keys.has("d")) axisX += 1;
  if (keys.has("arrowup") || keys.has("w")) axisY -= 1;
  if (keys.has("arrowdown") || keys.has("s")) axisY += 1;

  if (game.pointerTarget) {
    const dx = game.pointerTarget.x - player.x;
    const dy = game.pointerTarget.y - player.y;
    const length = Math.hypot(dx, dy);
    if (length > 8) {
      axisX += dx / length;
      axisY += dy / length;
    }
  }

  const length = Math.hypot(axisX, axisY);
  if (length > 0) {
    const boost = player.shield > 0 ? 1.08 : 1;
    player.x += (axisX / length) * player.speed * boost * delta;
    player.y += (axisY / length) * player.speed * boost * delta;
  }

  player.x = clamp(player.x, player.radius, WIDTH - player.radius);
  player.y = clamp(player.y, player.radius, HEIGHT - player.radius);
}

function updateSpawners(delta) {
  const difficulty = clamp(game.elapsed / GAME_SECONDS, 0, 1);
  game.shardTimer -= delta;
  game.virusTimer -= delta;
  game.patchTimer -= delta;

  if (game.shardTimer <= 0 && shards.length < 16) {
    spawnShard();
    game.shardTimer = random(0.42, 0.78) - difficulty * 0.15;
  }

  if (game.virusTimer <= 0 && viruses.length < 5 + difficulty * 8) {
    spawnVirus();
    game.virusTimer = random(1.05, 1.7) - difficulty * 0.45;
  }

  if (game.patchTimer <= 0 && patches.length < 2) {
    spawnPatch();
    game.patchTimer = random(9, 14);
  }
}

function updateViruses(delta) {
  for (const virus of viruses) {
    const turnTowardPlayer = Math.atan2(player.y - virus.y, player.x - virus.x);
    virus.vx += Math.cos(turnTowardPlayer) * 16 * delta;
    virus.vy += Math.sin(turnTowardPlayer) * 16 * delta;
    virus.x += virus.vx * delta;
    virus.y += virus.vy * delta;
    virus.angle += virus.spin * delta;

    if (virus.x < virus.radius || virus.x > WIDTH - virus.radius) {
      virus.vx *= -0.9;
      virus.x = clamp(virus.x, virus.radius, WIDTH - virus.radius);
    }
    if (virus.y < virus.radius || virus.y > HEIGHT - virus.radius) {
      virus.vy *= -0.9;
      virus.y = clamp(virus.y, virus.radius, HEIGHT - virus.radius);
    }
  }

  for (let i = viruses.length - 1; i >= 0; i -= 1) {
    const virus = viruses[i];
    if (distance(player, virus) > player.radius + virus.radius) {
      continue;
    }

    if (player.shield > 0) {
      game.score += 75;
      burst(virus.x, virus.y, "#8affc1", 18);
      viruses.splice(i, 1);
      continue;
    }

    if (player.invulnerable <= 0) {
      game.lives -= 1;
      player.invulnerable = 1.6;
      burst(player.x, player.y, "#ff5f7a", 24);
      if (game.lives <= 0) {
        finishGame(false);
      }
    }
  }
}

function updateCollectibles(delta) {
  for (const shard of shards) {
    shard.pulse += delta * 4;
  }
  for (const patch of patches) {
    patch.ttl -= delta;
    patch.pulse += delta * 5;
  }

  for (let i = shards.length - 1; i >= 0; i -= 1) {
    const shard = shards[i];
    if (distance(player, shard) <= player.radius + shard.radius) {
      game.score += shard.value;
      burst(shard.x, shard.y, shard.value > 50 ? "#f8e36a" : "#58d7ff");
      shards.splice(i, 1);
    }
  }

  for (let i = patches.length - 1; i >= 0; i -= 1) {
    const patch = patches[i];
    if (patch.ttl <= 0) {
      patches.splice(i, 1);
    } else if (distance(player, patch) <= player.radius + patch.radius) {
      player.shield = 6;
      player.invulnerable = 0.6;
      burst(patch.x, patch.y, "#8affc1", 22);
      patches.splice(i, 1);
    }
  }
}

function updateParticles(delta) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= 0.985;
    particle.vy *= 0.985;
    if (particle.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function finishGame(won) {
  if (game.state !== "running") {
    return;
  }
  game.state = won ? "won" : "lost";
  game.bestScore = Math.max(game.bestScore, game.score);
  localStorage.setItem(BEST_SCORE_KEY, game.bestScore.toString());
  updateHud();

  const remaining = Math.max(0, Math.ceil(game.timeLeft));
  if (won) {
    showOverlay(
      "压缩完成",
      `你用 ${GAME_SECONDS - remaining} 秒收集了 ${game.score} 分数据，成功把构建包压进 20MB。`,
    );
  } else {
    showOverlay(
      "数据包崩溃",
      `最终得分 ${game.score}。目标是 ${TARGET_SCORE} 分；调整路线、利用绿色补丁再试一次。`,
    );
  }
}

function togglePause() {
  if (game.state === "running") {
    game.state = "paused";
    showOverlay("暂停中", "按 P 或点击按钮继续压缩数据包。", "继续游戏");
  } else if (game.state === "paused") {
    game.state = "running";
    game.lastFrame = performance.now();
    hideOverlay();
  }
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawCollectibles();
  drawViruses();
  drawPlayer();
  drawParticles();
  drawTargetMeter();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#071024");
  gradient.addColorStop(0.55, "#070b18");
  gradient.addColorStop(1, "#101a2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.26;
  ctx.strokeStyle = "#58d7ff";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 110, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y + 110);
    ctx.stroke();
  }
  ctx.restore();

  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#d8f6ff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCollectibles() {
  for (const shard of shards) {
    const glow = Math.sin(shard.pulse) * 3;
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.pulse * 0.4);
    ctx.shadowColor = shard.value > 50 ? "#f8e36a" : "#58d7ff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = shard.value > 50 ? "#f8e36a" : "#58d7ff";
    ctx.beginPath();
    ctx.moveTo(0, -shard.radius - glow);
    ctx.lineTo(shard.radius + glow, 0);
    ctx.lineTo(0, shard.radius + glow);
    ctx.lineTo(-shard.radius - glow, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (const patch of patches) {
    const ring = patch.radius + Math.sin(patch.pulse) * 4;
    ctx.save();
    ctx.translate(patch.x, patch.y);
    ctx.shadowColor = "#8affc1";
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "#8affc1";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, ring, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#8affc1";
    ctx.fillRect(-3, -11, 6, 22);
    ctx.fillRect(-11, -3, 22, 6);
    ctx.restore();
  }
}

function drawViruses() {
  for (const virus of viruses) {
    ctx.save();
    ctx.translate(virus.x, virus.y);
    ctx.rotate(virus.angle);
    ctx.shadowColor = "#ff5f7a";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ff5f7a";
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10;
      const radius = i % 2 === 0 ? virus.radius : virus.radius * 0.66;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#240713";
    ctx.beginPath();
    ctx.arc(-virus.radius * 0.28, -virus.radius * 0.12, 3.4, 0, Math.PI * 2);
    ctx.arc(virus.radius * 0.28, -virus.radius * 0.12, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer() {
  const flicker = player.invulnerable > 0 && Math.floor(performance.now() / 90) % 2 === 0;
  if (flicker && player.shield <= 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.shadowColor = player.shield > 0 ? "#8affc1" : "#58d7ff";
  ctx.shadowBlur = 24;
  ctx.fillStyle = player.shield > 0 ? "#8affc1" : "#eef6ff";
  ctx.beginPath();
  ctx.moveTo(0, -player.radius - 8);
  ctx.bezierCurveTo(player.radius + 16, -5, player.radius + 4, player.radius + 12, 0, player.radius);
  ctx.bezierCurveTo(-player.radius - 4, player.radius + 12, -player.radius - 16, -5, 0, -player.radius - 8);
  ctx.fill();
  ctx.fillStyle = "#071024";
  ctx.beginPath();
  ctx.arc(0, -3, 6, 0, Math.PI * 2);
  ctx.fill();

  if (player.shield > 0) {
    ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 120) * 0.08;
    ctx.strokeStyle = "#8affc1";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
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

function drawTargetMeter() {
  const x = 24;
  const y = HEIGHT - 28;
  const width = 240;
  const height = 10;
  const progress = clamp(game.score / TARGET_SCORE, 0, 1);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = progress >= 1 ? "#8affc1" : "#58d7ff";
  ctx.fillRect(x, y, width * progress, height);
  ctx.fillStyle = "#cfeeff";
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.fillText(`20MB target ${Math.floor(progress * 100)}%`, x, y - 8);
}

function frame(timestamp) {
  if (!game.lastFrame) {
    game.lastFrame = timestamp;
  }
  const delta = Math.min((timestamp - game.lastFrame) / 1000, 0.033);
  game.lastFrame = timestamp;
  update(delta);
  draw();
  requestAnimationFrame(frame);
}

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
  };
}

primaryAction.addEventListener("click", () => {
  if (game.state === "paused") {
    togglePause();
  } else {
    resetGame();
  }
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
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
  if ((key === "enter" || key === " ") && game.state !== "running") {
    resetGame();
    return;
  }
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  game.pointerTarget = canvasPointFromEvent(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (canvas.hasPointerCapture(event.pointerId)) {
    game.pointerTarget = canvasPointFromEvent(event);
  }
});

canvas.addEventListener("pointerup", (event) => {
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  game.pointerTarget = null;
});

window.addEventListener("resize", setCanvasScale);

setCanvasScale();
updateHud();
draw();
requestAnimationFrame(frame);
