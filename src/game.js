const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const startButton = document.querySelector("#startButton");
const muteButton = document.querySelector("#muteButton");
const overlay = document.querySelector("#overlay");
const scoreText = document.querySelector("#scoreText");
const waveText = document.querySelector("#waveText");
const shieldText = document.querySelector("#shieldText");
const touchStick = document.querySelector("#touchStick");
const touchFire = document.querySelector("#touchFire");

const WORLD = {
  width: 1280,
  height: 720,
  centerX: 640,
  centerY: 360,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const randomRange = (min, max) => min + Math.random() * (max - min);
const wrap = (value, max) => (value + max) % max;

const keys = new Set();
const pointer = {
  x: WORLD.centerX,
  y: WORLD.centerY,
  down: false,
  touched: false,
};
const touchMove = { x: 0, y: 0, id: null };

let audioContext;
let muted = false;
let player;
let state;
let stars = [];
let bullets = [];
let enemies = [];
let crystals = [];
let particles = [];
let lastFrame = performance.now();

function createInitialState() {
  return {
    running: false,
    paused: false,
    gameOver: false,
    time: 0,
    wave: 1,
    score: 0,
    combo: 1,
    comboTimer: 0,
    spawnTimer: 1.4,
    crystalTimer: 0.4,
    fireTimer: 0,
    shake: 0,
    bestScore: Number(localStorage.getItem("stardust-courier-best") || 0),
  };
}

function createPlayer() {
  return {
    x: WORLD.centerX,
    y: WORLD.centerY + 150,
    vx: 0,
    vy: 0,
    radius: 18,
    angle: -Math.PI / 2,
    shield: 100,
    invulnerable: 0,
    cargo: 0,
    boost: 0,
    trail: [],
  };
}

function resetGame() {
  player = createPlayer();
  state = createInitialState();
  state.running = true;
  bullets = [];
  enemies = [];
  crystals = [];
  particles = [];
  spawnCrystal(8);
  overlay.classList.add("is-hidden");
  startButton.textContent = "重新开始";
  playTone(420, 0.12, "triangle", 0.08);
  updateHud();
}

function seedStars() {
  stars = Array.from({ length: 170 }, () => ({
    x: Math.random() * WORLD.width,
    y: Math.random() * WORLD.height,
    z: randomRange(0.2, 1),
    twinkle: Math.random() * Math.PI * 2,
  }));
}

function edgeSpawnPoint() {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: randomRange(-40, WORLD.width + 40), y: -45 };
  if (side === 1) return { x: WORLD.width + 45, y: randomRange(-40, WORLD.height + 40) };
  if (side === 2) return { x: randomRange(-40, WORLD.width + 40), y: WORLD.height + 45 };
  return { x: -45, y: randomRange(-40, WORLD.height + 40) };
}

function spawnEnemy(count = 1) {
  for (let i = 0; i < count; i += 1) {
    const point = edgeSpawnPoint();
    const heavy = state.wave >= 4 && Math.random() < 0.22;
    enemies.push({
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      radius: heavy ? 24 : 17,
      hp: heavy ? 4 + Math.floor(state.wave / 2) : 2 + Math.floor(state.wave / 3),
      speed: heavy ? randomRange(58, 82) : randomRange(90, 132) + state.wave * 4,
      turn: randomRange(1.5, 2.8),
      wobble: Math.random() * Math.PI * 2,
      heavy,
      flash: 0,
    });
  }
}

function spawnCrystal(count = 1) {
  for (let i = 0; i < count; i += 1) {
    crystals.push({
      x: randomRange(70, WORLD.width - 70),
      y: randomRange(70, WORLD.height - 70),
      radius: randomRange(10, 15),
      spin: Math.random() * Math.PI,
      value: Math.floor(randomRange(80, 150)),
    });
  }
}

function createBurst(x, y, color, count, speed = 180) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = randomRange(speed * 0.2, speed);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: randomRange(0.25, 0.8),
      maxLife: 0.8,
      size: randomRange(1.8, 5.2),
      color,
    });
  }
}

function getMovementVector() {
  let x = 0;
  let y = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) y -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) y += 1;
  x += touchMove.x;
  y += touchMove.y;

  const length = Math.hypot(x, y);
  if (length > 1) {
    x /= length;
    y /= length;
  }
  return { x, y };
}

function updatePlayer(delta) {
  const movement = getMovementVector();
  const boostMultiplier = player.boost > 0 ? 1.35 : 1;
  const acceleration = 760 * boostMultiplier;
  const drag = Math.pow(0.035, delta);

  player.vx = (player.vx + movement.x * acceleration * delta) * drag;
  player.vy = (player.vy + movement.y * acceleration * delta) * drag;
  player.x = clamp(player.x + player.vx * delta, player.radius, WORLD.width - player.radius);
  player.y = clamp(player.y + player.vy * delta, player.radius, WORLD.height - player.radius);
  player.boost = Math.max(0, player.boost - delta);
  player.invulnerable = Math.max(0, player.invulnerable - delta);

  if (pointer.touched || pointer.down) {
    player.angle = Math.atan2(pointer.y - player.y, pointer.x - player.x);
  } else if (Math.hypot(movement.x, movement.y) > 0.1) {
    player.angle = Math.atan2(movement.y, movement.x);
  }

  player.trail.push({ x: player.x, y: player.y, life: 0.28 });
  if (player.trail.length > 18) player.trail.shift();
  player.trail.forEach((point) => {
    point.life -= delta;
  });
  player.trail = player.trail.filter((point) => point.life > 0);
}

function fireBullet() {
  if (state.fireTimer > 0 || state.paused || !state.running || state.gameOver) return;
  state.fireTimer = 0.16;
  const muzzle = player.radius + 14;
  const speed = 660;
  bullets.push({
    x: player.x + Math.cos(player.angle) * muzzle,
    y: player.y + Math.sin(player.angle) * muzzle,
    vx: Math.cos(player.angle) * speed + player.vx * 0.15,
    vy: Math.sin(player.angle) * speed + player.vy * 0.15,
    radius: 5,
    life: 0.92,
    damage: 1,
  });
  createBurst(
    player.x + Math.cos(player.angle) * muzzle,
    player.y + Math.sin(player.angle) * muzzle,
    "#68f7ff",
    4,
    80,
  );
  playTone(620, 0.04, "square", 0.025);
}

function updateBullets(delta) {
  state.fireTimer = Math.max(0, state.fireTimer - delta);
  if (pointer.down || keys.has("Space")) fireBullet();

  bullets.forEach((bullet) => {
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;
    bullet.life -= delta;
  });
  bullets = bullets.filter(
    (bullet) =>
      bullet.life > 0 &&
      bullet.x > -30 &&
      bullet.x < WORLD.width + 30 &&
      bullet.y > -30 &&
      bullet.y < WORLD.height + 30,
  );
}

function updateEnemies(delta) {
  state.wave = 1 + Math.floor(state.time / 24);
  state.spawnTimer -= delta;
  if (state.spawnTimer <= 0) {
    const count = 1 + Math.floor(state.wave / 3) + (Math.random() < 0.25 ? 1 : 0);
    spawnEnemy(count);
    state.spawnTimer = clamp(1.25 - state.wave * 0.055, 0.42, 1.25);
  }

  enemies.forEach((enemy) => {
    const toPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemy.wobble += delta * enemy.turn;
    const desired = toPlayer + Math.sin(enemy.wobble) * (enemy.heavy ? 0.22 : 0.36);
    enemy.vx += Math.cos(desired) * enemy.speed * delta * enemy.turn;
    enemy.vy += Math.sin(desired) * enemy.speed * delta * enemy.turn;
    const drag = Math.pow(enemy.heavy ? 0.1 : 0.065, delta);
    enemy.vx *= drag;
    enemy.vy *= drag;
    enemy.x += enemy.vx * delta;
    enemy.y += enemy.vy * delta;
    enemy.flash = Math.max(0, enemy.flash - delta);
  });
}

function updateCrystals(delta) {
  state.crystalTimer -= delta;
  if (state.crystalTimer <= 0 && crystals.length < 16) {
    spawnCrystal(Math.random() < 0.35 ? 2 : 1);
    state.crystalTimer = randomRange(1.4, 2.4);
  }

  crystals.forEach((crystal) => {
    crystal.spin += delta * 2.2;
    if (distance(player, crystal) < player.radius + crystal.radius + 5) {
      player.cargo += 1;
      player.boost = 1.15;
      state.score += Math.round(crystal.value * state.combo);
      state.combo = Math.min(8, state.combo + 0.25);
      state.comboTimer = 3;
      crystal.collected = true;
      createBurst(crystal.x, crystal.y, "#ffd166", 14, 180);
      playTone(820 + player.cargo * 18, 0.09, "sine", 0.05);
    }
  });
  crystals = crystals.filter((crystal) => !crystal.collected);

  const baseDistance = Math.hypot(player.x - WORLD.centerX, player.y - WORLD.centerY);
  if (player.cargo > 0 && baseDistance < 58) {
    const delivered = player.cargo;
    player.cargo = 0;
    state.score += delivered * 180 * state.wave;
    player.shield = Math.min(100, player.shield + delivered * 4);
    createBurst(WORLD.centerX, WORLD.centerY, "#8cffc7", delivered * 8 + 8, 230);
    playTone(310, 0.16, "triangle", 0.08);
  }
}

function handleCollisions() {
  enemies.forEach((enemy) => {
    bullets.forEach((bullet) => {
      if (bullet.hit || distance(enemy, bullet) > enemy.radius + bullet.radius) return;
      bullet.hit = true;
      enemy.hp -= bullet.damage;
      enemy.flash = 0.08;
      createBurst(bullet.x, bullet.y, "#68f7ff", 5, 140);
    });

    if (enemy.hp <= 0 && !enemy.dead) {
      enemy.dead = true;
      state.score += Math.round((enemy.heavy ? 260 : 120) * state.combo);
      state.combo = Math.min(8, state.combo + 0.35);
      state.comboTimer = 3.2;
      state.shake = Math.max(state.shake, enemy.heavy ? 9 : 5);
      createBurst(enemy.x, enemy.y, enemy.heavy ? "#ff5cf4" : "#ff5b7a", enemy.heavy ? 26 : 16, 280);
      playTone(enemy.heavy ? 150 : 190, 0.12, "sawtooth", 0.045);
    }

    if (
      player.invulnerable <= 0 &&
      !enemy.dead &&
      distance(player, enemy) < player.radius + enemy.radius
    ) {
      const damage = enemy.heavy ? 24 : 15;
      player.shield -= damage;
      player.invulnerable = 0.72;
      state.shake = Math.max(state.shake, 13);
      enemy.dead = true;
      createBurst(player.x, player.y, "#ff5b7a", 28, 320);
      playTone(96, 0.18, "sawtooth", 0.07);
      if (player.shield <= 0) endGame();
    }
  });

  bullets = bullets.filter((bullet) => !bullet.hit);
  enemies = enemies.filter((enemy) => !enemy.dead);
}

function updateParticles(delta) {
  particles.forEach((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= Math.pow(0.08, delta);
    particle.vy *= Math.pow(0.08, delta);
    particle.life -= delta;
  });
  particles = particles.filter((particle) => particle.life > 0);
}

function updateHud() {
  scoreText.textContent = Math.floor(state.score).toLocaleString("zh-CN");
  waveText.textContent = String(state.wave);
  shieldText.textContent = `${Math.max(0, Math.ceil(player.shield))}%`;
  shieldText.style.color = player.shield < 30 ? "var(--danger)" : "inherit";
}

function endGame() {
  state.gameOver = true;
  state.running = false;
  state.bestScore = Math.max(state.bestScore, Math.floor(state.score));
  localStorage.setItem("stardust-courier-best", String(state.bestScore));
  overlay.innerHTML = `
    <h2>任务结束</h2>
    <p>最终得分 ${Math.floor(state.score).toLocaleString("zh-CN")}；最高记录 ${state.bestScore.toLocaleString("zh-CN")}。</p>
    <p class="overlay-small">点击“重新开始”或按 R 再次出发。</p>
  `;
  overlay.classList.remove("is-hidden");
}

function togglePause() {
  if (!state.running || state.gameOver) return;
  state.paused = !state.paused;
  if (state.paused) {
    overlay.innerHTML = `
      <h2>任务暂停</h2>
      <p>按 P 继续，或点击“重新开始”重置当前任务。</p>
    `;
    overlay.classList.remove("is-hidden");
  } else {
    overlay.classList.add("is-hidden");
  }
}

function update(delta) {
  if (!state.running || state.paused || state.gameOver) return;
  state.time += delta;
  state.comboTimer = Math.max(0, state.comboTimer - delta);
  if (state.comboTimer <= 0) state.combo = Math.max(1, state.combo - delta * 0.65);
  state.shake = Math.max(0, state.shake - delta * 24);

  updatePlayer(delta);
  updateBullets(delta);
  updateEnemies(delta);
  updateCrystals(delta);
  handleCollisions();
  updateParticles(delta);
  updateHud();
}

function drawBackground(now) {
  const gradient = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
  gradient.addColorStop(0, "#02040b");
  gradient.addColorStop(0.55, "#080e20");
  gradient.addColorStop(1, "#15091e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.save();
  stars.forEach((star) => {
    star.x = wrap(star.x - star.z * 7 * (state.running ? 0.018 : 0.006), WORLD.width);
    const pulse = 0.55 + Math.sin(now * 0.0015 + star.twinkle) * 0.35;
    ctx.globalAlpha = clamp(pulse * star.z, 0.15, 0.95);
    ctx.fillStyle = star.z > 0.75 ? "#e9fbff" : "#7aa4d6";
    ctx.fillRect(star.x, star.y, 1.2 + star.z * 1.8, 1.2 + star.z * 1.8);
  });
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#68f7ff";
  ctx.lineWidth = 1;
  for (let x = 0; x < WORLD.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 60, WORLD.height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBase(now) {
  const pulse = 1 + Math.sin(now * 0.003) * 0.07;
  ctx.save();
  ctx.translate(WORLD.centerX, WORLD.centerY);
  ctx.rotate(now * 0.0005);
  ctx.strokeStyle = "rgba(140, 255, 199, 0.6)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 52 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(104, 247, 255, 0.09)";
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 6; i += 1) {
    ctx.rotate(Math.PI / 3);
    ctx.fillStyle = i % 2 ? "#68f7ff" : "#8cffc7";
    ctx.fillRect(38, -3, 18, 6);
  }
  ctx.restore();
}

function drawCrystals() {
  crystals.forEach((crystal) => {
    ctx.save();
    ctx.translate(crystal.x, crystal.y);
    ctx.rotate(crystal.spin);
    const gradient = ctx.createRadialGradient(0, 0, 1, 0, 0, crystal.radius * 2.4);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.92)");
    gradient.addColorStop(0.35, "#ffd166");
    gradient.addColorStop(1, "rgba(255, 209, 102, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      const radius = i % 2 ? crystal.radius * 0.68 : crystal.radius;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(angle);
    ctx.fillStyle = enemy.flash > 0 ? "#ffffff" : enemy.heavy ? "#ff5cf4" : "#ff5b7a";
    ctx.shadowColor = enemy.heavy ? "#ff5cf4" : "#ff5b7a";
    ctx.shadowBlur = enemy.heavy ? 20 : 12;
    ctx.beginPath();
    ctx.moveTo(enemy.radius, 0);
    ctx.lineTo(-enemy.radius * 0.75, -enemy.radius * 0.72);
    ctx.lineTo(-enemy.radius * 0.35, 0);
    ctx.lineTo(-enemy.radius * 0.75, enemy.radius * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  });
}

function drawBullets() {
  ctx.save();
  ctx.fillStyle = "#68f7ff";
  ctx.shadowColor = "#68f7ff";
  ctx.shadowBlur = 12;
  bullets.forEach((bullet) => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  player.trail.forEach((point) => {
    ctx.globalAlpha = clamp(point.life / 0.28, 0, 1) * 0.36;
    ctx.fillStyle = "#68f7ff";
    ctx.beginPath();
    ctx.arc(point.x, point.y, player.radius * (point.life / 0.28), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  ctx.fillStyle = player.invulnerable > 0 && Math.sin(performance.now() * 0.04) > 0 ? "#ffffff" : "#dffcff";
  ctx.shadowColor = "#68f7ff";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(25, 0);
  ctx.lineTo(-18, -15);
  ctx.lineTo(-9, 0);
  ctx.lineTo(-18, 15);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ff5cf4";
  ctx.fillRect(-20, -4, 10, 8);
  ctx.restore();

  if (player.invulnerable > 0 || player.shield > 70) {
    ctx.save();
    ctx.globalAlpha = player.invulnerable > 0 ? 0.65 : 0.25;
    ctx.strokeStyle = "#68f7ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  particles.forEach((particle) => {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawHud() {
  ctx.save();
  ctx.fillStyle = "rgba(2, 4, 11, 0.46)";
  ctx.fillRect(20, 20, 310, 78);
  ctx.strokeStyle = "rgba(104, 247, 255, 0.18)";
  ctx.strokeRect(20.5, 20.5, 309, 77);
  ctx.fillStyle = "#f7fbff";
  ctx.font = "700 18px Inter, sans-serif";
  ctx.fillText(`Cargo ${player.cargo}  Combo x${state.combo.toFixed(1)}`, 38, 52);
  ctx.fillStyle = "#9fb0cb";
  ctx.font = "600 14px Inter, sans-serif";
  ctx.fillText(`Best ${state.bestScore.toLocaleString("zh-CN")}  Time ${Math.floor(state.time)}s`, 38, 78);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(WORLD.width - 220, 28, 174, 12);
  ctx.fillStyle = player.shield < 30 ? "#ff5b7a" : "#8cffc7";
  ctx.fillRect(WORLD.width - 220, 28, 174 * clamp(player.shield / 100, 0, 1), 12);
  ctx.restore();
}

function draw(now) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate(randomRange(-state.shake, state.shake), randomRange(-state.shake, state.shake));
  }
  drawBackground(now);
  drawBase(now);
  drawCrystals();
  drawBullets();
  drawEnemies();
  drawParticles();
  if (player) drawPlayer();
  ctx.restore();
  if (player) drawHud();
}

function loop(now) {
  const delta = Math.min(0.033, (now - lastFrame) / 1000 || 0);
  lastFrame = now;
  update(delta);
  draw(now);
  requestAnimationFrame(loop);
}

function setPointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * WORLD.width;
  pointer.y = ((event.clientY - rect.top) / rect.height) * WORLD.height;
  pointer.touched = true;
}

function setupAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") audioContext.resume();
}

function playTone(frequency, duration, type = "sine", volume = 0.04) {
  if (muted || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function updateTouchStick(event) {
  const touch = [...event.changedTouches].find((item) => item.identifier === touchMove.id);
  if (!touch) return;
  const rect = touchStick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = touch.clientX - centerX;
  const dy = touch.clientY - centerY;
  const length = Math.hypot(dx, dy);
  const max = 40;
  const scale = length > max ? max / length : 1;
  const knobX = dx * scale;
  const knobY = dy * scale;
  touchMove.x = clamp(dx / max, -1, 1);
  touchMove.y = clamp(dy / max, -1, 1);
  touchStick.style.setProperty("--stick-x", `${knobX}px`);
  touchStick.style.setProperty("--stick-y", `${knobY}px`);
}

function resetTouchStick() {
  touchMove.x = 0;
  touchMove.y = 0;
  touchMove.id = null;
  touchStick.style.setProperty("--stick-x", "0px");
  touchStick.style.setProperty("--stick-y", "0px");
}

startButton.addEventListener("click", () => {
  setupAudio();
  resetGame();
});

muteButton.addEventListener("click", () => {
  muted = !muted;
  muteButton.textContent = muted ? "音效：关" : "音效：开";
  muteButton.setAttribute("aria-pressed", String(muted));
  if (!muted) setupAudio();
});

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space") event.preventDefault();
  if (event.code === "KeyP") togglePause();
  if (event.code === "KeyR") {
    setupAudio();
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

canvas.addEventListener("pointermove", setPointerFromEvent);
canvas.addEventListener("pointerdown", (event) => {
  setupAudio();
  setPointerFromEvent(event);
  pointer.down = true;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointerup", (event) => {
  pointer.down = false;
  canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener("pointerleave", () => {
  pointer.down = false;
});

touchStick.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    if (touchMove.id !== null) return;
    touchMove.id = event.changedTouches[0].identifier;
    updateTouchStick(event);
  },
  { passive: false },
);
touchStick.addEventListener(
  "touchmove",
  (event) => {
    event.preventDefault();
    updateTouchStick(event);
  },
  { passive: false },
);
touchStick.addEventListener("touchend", resetTouchStick);
touchStick.addEventListener("touchcancel", resetTouchStick);

touchFire.addEventListener("touchstart", (event) => {
  event.preventDefault();
  setupAudio();
  pointer.down = true;
});
touchFire.addEventListener("touchend", () => {
  pointer.down = false;
});
touchFire.addEventListener("touchcancel", () => {
  pointer.down = false;
});

state = createInitialState();
player = createPlayer();
seedStars();
spawnCrystal(6);
updateHud();
requestAnimationFrame(loop);
