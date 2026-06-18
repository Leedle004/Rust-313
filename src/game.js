(function () {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("best-score");
  const livesEl = document.getElementById("lives");
  const levelEl = document.getElementById("level");
  const overlay = document.getElementById("overlay");
  const overlayKicker = document.getElementById("overlay-kicker");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayMessage = document.getElementById("overlay-message");
  const startButton = document.getElementById("start-button");

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const PLAYER_WIDTH = 58;
  const PLAYER_HEIGHT = 44;
  const PLAYER_SPEED = 430;
  const BULLET_SPEED = 720;
  const ENEMY_BASE_SPEED = 86;
  const ENEMY_SPAWN_BASE = 1.15;
  const STAR_COUNT = 100;
  const BEST_SCORE_KEY = "starDefenderBestScore";

  const keys = new Set();
  const stars = createStars();

  let state = "ready";
  let lastTime = 0;
  let shootCooldown = 0;
  let spawnTimer = 0;
  let elapsed = 0;
  let score = 0;
  let bestScore = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
  let lives = 3;
  let level = 1;
  let player = createPlayer();
  let bullets = [];
  let enemies = [];
  let particles = [];

  bestScoreEl.textContent = bestScore;
  updateHud();
  drawScene();

  startButton.addEventListener("click", startGame);

  window.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
      event.preventDefault();
    }

    if (event.code === "Enter") {
      startGame();
      return;
    }

    if (event.code === "KeyP") {
      togglePause();
      return;
    }

    keys.add(event.code);
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  function createPlayer() {
    return {
      x: WIDTH / 2,
      y: HEIGHT - 72,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      invulnerable: 0,
    };
  }

  function createStars() {
    return Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      radius: Math.random() * 1.8 + 0.25,
      speed: Math.random() * 34 + 16,
      alpha: Math.random() * 0.55 + 0.25,
    }));
  }

  function startGame() {
    player = createPlayer();
    bullets = [];
    enemies = [];
    particles = [];
    shootCooldown = 0;
    spawnTimer = 0.45;
    elapsed = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    lastTime = performance.now();
    updateHud();
    hideOverlay();
    requestAnimationFrame(loop);
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      showOverlay("暂停", "已暂停", "按 P 或 Enter 继续战斗。", "继续游戏");
      return;
    }

    if (state === "paused") {
      state = "playing";
      lastTime = performance.now();
      hideOverlay();
      requestAnimationFrame(loop);
    }
  }

  function loop(timestamp) {
    if (state !== "playing") {
      return;
    }

    const delta = Math.min((timestamp - lastTime) / 1000, 0.033);
    lastTime = timestamp;

    update(delta);
    drawScene();
    requestAnimationFrame(loop);
  }

  function update(delta) {
    elapsed += delta;
    level = Math.floor(elapsed / 18) + 1;
    shootCooldown = Math.max(0, shootCooldown - delta);
    player.invulnerable = Math.max(0, player.invulnerable - delta);

    updateStars(delta);
    updatePlayer(delta);
    updateBullets(delta);
    updateEnemies(delta);
    updateParticles(delta);
    handleCollisions();
    updateHud();
  }

  function updateStars(delta) {
    for (const star of stars) {
      star.y += star.speed * delta;
      if (star.y > HEIGHT) {
        star.y = -4;
        star.x = Math.random() * WIDTH;
      }
    }
  }

  function updatePlayer(delta) {
    let direction = 0;

    if (keys.has("ArrowLeft") || keys.has("KeyA")) {
      direction -= 1;
    }

    if (keys.has("ArrowRight") || keys.has("KeyD")) {
      direction += 1;
    }

    player.x = clamp(
      player.x + direction * PLAYER_SPEED * delta,
      PLAYER_WIDTH / 2 + 16,
      WIDTH - PLAYER_WIDTH / 2 - 16,
    );

    if (keys.has("Space") && shootCooldown === 0) {
      shoot();
    }
  }

  function shoot() {
    shootCooldown = 0.17;
    bullets.push({
      x: player.x,
      y: player.y - player.height / 2,
      width: 7,
      height: 22,
      speed: BULLET_SPEED,
    });
  }

  function updateBullets(delta) {
    for (const bullet of bullets) {
      bullet.y -= bullet.speed * delta;
    }

    bullets = bullets.filter((bullet) => bullet.y + bullet.height > -20);
  }

  function updateEnemies(delta) {
    spawnTimer -= delta;

    if (spawnTimer <= 0) {
      spawnEnemy();
      const spawnRate = Math.max(0.36, ENEMY_SPAWN_BASE - level * 0.06);
      spawnTimer = spawnRate * (0.72 + Math.random() * 0.55);
    }

    for (const enemy of enemies) {
      enemy.y += enemy.speed * delta;
      enemy.x += Math.sin(elapsed * enemy.wobbleSpeed + enemy.phase) * enemy.drift * delta;
    }

    const escaped = enemies.filter((enemy) => enemy.y - enemy.radius > HEIGHT);
    if (escaped.length > 0) {
      lives = Math.max(0, lives - escaped.length);
      shakePlayer();
    }

    enemies = enemies.filter((enemy) => enemy.y - enemy.radius <= HEIGHT);

    if (lives <= 0) {
      endGame();
    }
  }

  function spawnEnemy() {
    const radius = Math.random() * 13 + 18;
    enemies.push({
      x: Math.random() * (WIDTH - radius * 2 - 40) + radius + 20,
      y: -radius - 8,
      radius,
      speed: ENEMY_BASE_SPEED + level * 12 + Math.random() * 46,
      drift: Math.random() * 50 + 10,
      wobbleSpeed: Math.random() * 1.5 + 0.8,
      phase: Math.random() * Math.PI * 2,
      hp: radius > 27 ? 2 : 1,
      value: radius > 27 ? 140 : 90,
    });
  }

  function updateParticles(delta) {
    for (const particle of particles) {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.life -= delta;
      particle.rotation += particle.spin * delta;
    }

    particles = particles.filter((particle) => particle.life > 0);
  }

  function handleCollisions() {
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = enemies[enemyIndex];

      for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
        const bullet = bullets[bulletIndex];

        if (!circleRectCollision(enemy, bullet)) {
          continue;
        }

        bullets.splice(bulletIndex, 1);
        enemy.hp -= 1;
        createBurst(bullet.x, bullet.y, "#62e8ff", 8);

        if (enemy.hp <= 0) {
          enemies.splice(enemyIndex, 1);
          score += enemy.value + level * 8;
          createBurst(enemy.x, enemy.y, "#ffce5c", 22);
        }

        break;
      }
    }

    if (player.invulnerable > 0) {
      return;
    }

    const playerRect = {
      x: player.x - player.width / 2,
      y: player.y - player.height / 2,
      width: player.width,
      height: player.height,
    };

    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = enemies[enemyIndex];

      if (!circleRectCollision(enemy, playerRect)) {
        continue;
      }

      enemies.splice(enemyIndex, 1);
      lives = Math.max(0, lives - 1);
      player.invulnerable = 1.4;
      createBurst(player.x, player.y, "#ff5f7a", 30);
      shakePlayer();

      if (lives <= 0) {
        endGame();
      }

      return;
    }
  }

  function createBurst(x, y, color, amount) {
    for (let index = 0; index < amount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 190 + 45;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        life: Math.random() * 0.45 + 0.25,
        color,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 8,
      });
    }
  }

  function shakePlayer() {
    player.x = clamp(
      player.x + (Math.random() - 0.5) * 28,
      PLAYER_WIDTH / 2 + 16,
      WIDTH - PLAYER_WIDTH / 2 - 16,
    );
  }

  function endGame() {
    state = "gameover";
    bestScore = Math.max(bestScore, score);
    localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    updateHud();
    showOverlay("任务结束", "游戏结束", `最终得分：${score}。按 Enter 再来一局。`, "重新开始");
  }

  function updateHud() {
    scoreEl.textContent = score;
    bestScoreEl.textContent = bestScore;
    livesEl.textContent = lives;
    levelEl.textContent = level;
  }

  function drawScene() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackground();
    drawBullets();
    drawEnemies();
    drawPlayer();
    drawParticles();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#071427");
    gradient.addColorStop(1, "#020611");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (const star of stars) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(98, 232, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let y = 40; y < HEIGHT; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y + Math.sin(y) * 10);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);

    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    const shipGradient = ctx.createLinearGradient(0, -player.height, 0, player.height);
    shipGradient.addColorStop(0, "#eef7ff");
    shipGradient.addColorStop(0.5, "#62e8ff");
    shipGradient.addColorStop(1, "#1b74ff");

    ctx.fillStyle = shipGradient;
    ctx.beginPath();
    ctx.moveTo(0, -player.height / 2);
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.lineTo(0, player.height / 3);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 206, 92, 0.92)";
    ctx.beginPath();
    ctx.moveTo(-12, player.height / 2 - 5);
    ctx.lineTo(0, player.height / 2 + 18 + Math.random() * 5);
    ctx.lineTo(12, player.height / 2 - 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawBullets() {
    for (const bullet of bullets) {
      const gradient = ctx.createLinearGradient(0, bullet.y, 0, bullet.y + bullet.height);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(1, "#62e8ff");

      ctx.fillStyle = gradient;
      roundedRect(
        bullet.x - bullet.width / 2,
        bullet.y - bullet.height / 2,
        bullet.width,
        bullet.height,
        4,
      );
      ctx.fill();
    }
  }

  function drawEnemies() {
    for (const enemy of enemies) {
      const gradient = ctx.createRadialGradient(
        enemy.x - enemy.radius * 0.25,
        enemy.y - enemy.radius * 0.25,
        2,
        enemy.x,
        enemy.y,
        enemy.radius,
      );
      gradient.addColorStop(0, "#ffd8e1");
      gradient.addColorStop(0.55, "#ff5f7a");
      gradient.addColorStop(1, "#791735");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = enemy.hp > 1 ? "#ffce5c" : "rgba(255, 255, 255, 0.28)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius * 0.64, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawParticles() {
    for (const particle of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life * 2.2);
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      ctx.restore();
    }
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function circleRectCollision(circle, rect) {
    const nearestX = clamp(circle.x, rect.x, rect.x + rect.width);
    const nearestY = clamp(circle.y, rect.y, rect.y + rect.height);
    const distanceX = circle.x - nearestX;
    const distanceY = circle.y - nearestY;

    return distanceX * distanceX + distanceY * distanceY <= circle.radius * circle.radius;
  }

  function showOverlay(kicker, title, message, buttonText) {
    overlayKicker.textContent = kicker;
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    startButton.textContent = buttonText;
    overlay.classList.remove("is-hidden");
  }

  function hideOverlay() {
    overlay.classList.add("is-hidden");
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
