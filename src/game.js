(() => {
  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");

  const uploadedEl = document.querySelector("#uploaded");
  const cacheEl = document.querySelector("#cache");
  const shieldEl = document.querySelector("#shield");
  const timeEl = document.querySelector("#time");
  const overlay = document.querySelector("#overlay");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayCopy = document.querySelector("#overlay-copy");
  const startButton = document.querySelector("#start-button");

  const WIDTH = 960;
  const HEIGHT = 540;
  const ROUND_SECONDS = 60;
  const CACHE_LIMIT = 20;
  const PLAYER_RADIUS = 18;

  const keys = new Set();
  const pointer = {
    active: false,
    x: WIDTH * 0.22,
    y: HEIGHT * 0.5,
  };

  const state = {
    mode: "ready",
    elapsed: 0,
    uploaded: 0,
    cache: 0,
    shield: 0,
    streak: 1,
    packetTimer: 0,
    malwareTimer: 0,
    shieldTimer: 0,
    flash: 0,
    shake: 0,
    player: {
      x: WIDTH * 0.22,
      y: HEIGHT * 0.5,
      vx: 0,
      vy: 0,
    },
    packets: [],
    malware: [],
    shields: [],
    bursts: [],
  };

  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    z: Math.random() * 0.85 + 0.15,
  }));

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const distSq = (ax, ay, bx, by) => {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  };

  function resetGame() {
    state.mode = "running";
    state.elapsed = 0;
    state.uploaded = 0;
    state.cache = 0;
    state.shield = 0;
    state.streak = 1;
    state.packetTimer = 0.35;
    state.malwareTimer = 1.25;
    state.shieldTimer = 5.5;
    state.flash = 0;
    state.shake = 0;
    state.player.x = WIDTH * 0.22;
    state.player.y = HEIGHT * 0.5;
    state.player.vx = 0;
    state.player.vy = 0;
    pointer.x = state.player.x;
    pointer.y = state.player.y;
    state.packets.length = 0;
    state.malware.length = 0;
    state.shields.length = 0;
    state.bursts.length = 0;
    overlay.classList.add("hidden");
    updateHud();
  }

  function updateHud() {
    uploadedEl.textContent = `${state.uploaded}MB`;
    cacheEl.textContent = `${Math.floor(state.cache)}/${CACHE_LIMIT}MB`;
    shieldEl.textContent = `${Math.ceil(state.shield)}s`;
    timeEl.textContent = `${Math.ceil(Math.max(0, ROUND_SECONDS - state.elapsed))}s`;
  }

  function showOverlay(title, copy, buttonText) {
    overlayTitle.textContent = title;
    overlayCopy.textContent = copy;
    startButton.textContent = buttonText;
    overlay.classList.remove("hidden");
  }

  function finishGame() {
    state.mode = "gameover";
    const score = state.uploaded + Math.floor(state.cache);
    showOverlay(
      `Uploaded ${state.uploaded}MB`,
      `Final score: ${score}MB. The cache retained ${Math.floor(
        state.cache,
      )}MB. Try another run and chain more 20MB uploads.`,
      "Play again",
    );
  }

  function spawnPacket() {
    const mb = Math.floor(rand(1, 5));
    state.packets.push({
      type: "packet",
      x: WIDTH + 34,
      y: rand(58, HEIGHT - 58),
      r: 11 + mb * 2.5,
      mb,
      spin: rand(0, Math.PI * 2),
      speed: rand(130, 220) + state.elapsed * 1.5,
    });
  }

  function spawnMalware() {
    const size = rand(17, 28);
    state.malware.push({
      type: "malware",
      x: WIDTH + 48,
      y: rand(58, HEIGHT - 58),
      r: size,
      wobble: rand(0, Math.PI * 2),
      speed: rand(155, 245) + state.elapsed * 1.7,
    });
  }

  function spawnShield() {
    state.shields.push({
      type: "shield",
      x: WIDTH + 36,
      y: rand(70, HEIGHT - 70),
      r: 17,
      pulse: rand(0, Math.PI * 2),
      speed: rand(135, 185),
    });
  }

  function addBurst(x, y, text, color) {
    state.bursts.push({
      x,
      y,
      text,
      color,
      age: 0,
      life: 0.85,
    });
  }

  function updatePlayer(dt) {
    let ax = 0;
    let ay = 0;
    const left = keys.has("arrowleft") || keys.has("a");
    const right = keys.has("arrowright") || keys.has("d");
    const up = keys.has("arrowup") || keys.has("w");
    const down = keys.has("arrowdown") || keys.has("s");

    if (left) ax -= 1;
    if (right) ax += 1;
    if (up) ay -= 1;
    if (down) ay += 1;

    const speed = state.shield > 0 ? 365 : 320;
    const hasKeyboardInput = ax !== 0 || ay !== 0;

    if (hasKeyboardInput) {
      const mag = Math.hypot(ax, ay) || 1;
      state.player.vx = (ax / mag) * speed;
      state.player.vy = (ay / mag) * speed;
      pointer.x = state.player.x;
      pointer.y = state.player.y;
    } else if (pointer.active) {
      const dx = pointer.x - state.player.x;
      const dy = pointer.y - state.player.y;
      const distance = Math.hypot(dx, dy);
      const pace = clamp(distance * 5.5, 0, speed);
      state.player.vx = distance > 3 ? (dx / distance) * pace : 0;
      state.player.vy = distance > 3 ? (dy / distance) * pace : 0;
    } else {
      state.player.vx *= 0.88;
      state.player.vy *= 0.88;
    }

    state.player.x = clamp(
      state.player.x + state.player.vx * dt,
      PLAYER_RADIUS,
      WIDTH - PLAYER_RADIUS,
    );
    state.player.y = clamp(
      state.player.y + state.player.vy * dt,
      PLAYER_RADIUS,
      HEIGHT - PLAYER_RADIUS,
    );
  }

  function collectPacket(packet) {
    state.cache += packet.mb;
    state.streak = Math.min(8, state.streak + 0.25);
    addBurst(packet.x, packet.y, `+${packet.mb}MB`, "#58d6ff");

    while (state.cache >= CACHE_LIMIT) {
      state.cache -= CACHE_LIMIT;
      const bonus = Math.floor((state.streak - 1) * 4);
      state.uploaded += CACHE_LIMIT + bonus;
      state.flash = 0.35;
      addBurst(state.player.x + 18, state.player.y - 24, `UPLOAD +${CACHE_LIMIT + bonus}`, "#7dffb2");
    }
  }

  function hitMalware(malware) {
    if (state.shield > 0) {
      state.shield = Math.max(0, state.shield - 2.5);
      addBurst(malware.x, malware.y, "blocked", "#7dffb2");
    } else {
      const loss = Math.min(state.cache, 6);
      state.cache = Math.max(0, state.cache - 6);
      state.elapsed = Math.min(ROUND_SECONDS, state.elapsed + 2.5);
      state.streak = 1;
      state.shake = 0.25;
      addBurst(malware.x, malware.y, loss > 0 ? `-${Math.ceil(loss)}MB` : "-2s", "#ff5f73");
    }
  }

  function collectShield(shield) {
    state.shield = Math.min(12, state.shield + 7);
    state.cache = Math.min(CACHE_LIMIT - 1, state.cache + 2);
    addBurst(shield.x, shield.y, "shield +7s", "#7dffb2");
  }

  function updateItems(dt) {
    const difficulty = clamp(1 - state.elapsed / 110, 0.45, 1);

    state.packetTimer -= dt;
    state.malwareTimer -= dt;
    state.shieldTimer -= dt;

    if (state.packetTimer <= 0) {
      spawnPacket();
      state.packetTimer = rand(0.33, 0.72) * difficulty;
    }

    if (state.malwareTimer <= 0) {
      spawnMalware();
      state.malwareTimer = rand(0.82, 1.45) * difficulty;
    }

    if (state.shieldTimer <= 0) {
      spawnShield();
      state.shieldTimer = rand(6.4, 9.6);
    }

    for (const star of stars) {
      star.x -= (34 + star.z * 80) * dt;
      if (star.x < -4) {
        star.x = WIDTH + 4;
        star.y = Math.random() * HEIGHT;
      }
    }

    for (const list of [state.packets, state.malware, state.shields]) {
      for (const item of list) {
        item.x -= item.speed * dt;
        item.spin = (item.spin || 0) + dt * 3;
        item.wobble = (item.wobble || 0) + dt * 4;
        item.pulse = (item.pulse || 0) + dt * 5;
      }
    }

    const player = state.player;

    state.packets = state.packets.filter((packet) => {
      const hit =
        distSq(player.x, player.y, packet.x, packet.y) <
        (PLAYER_RADIUS + packet.r) * (PLAYER_RADIUS + packet.r);
      if (hit) collectPacket(packet);
      return !hit && packet.x > -60;
    });

    state.malware = state.malware.filter((malware) => {
      const hit =
        distSq(player.x, player.y, malware.x, malware.y) <
        (PLAYER_RADIUS + malware.r * 0.82) * (PLAYER_RADIUS + malware.r * 0.82);
      if (hit) hitMalware(malware);
      return !hit && malware.x > -70;
    });

    state.shields = state.shields.filter((shield) => {
      const hit =
        distSq(player.x, player.y, shield.x, shield.y) <
        (PLAYER_RADIUS + shield.r) * (PLAYER_RADIUS + shield.r);
      if (hit) collectShield(shield);
      return !hit && shield.x > -60;
    });

    state.bursts = state.bursts.filter((burst) => {
      burst.age += dt;
      burst.y -= 34 * dt;
      return burst.age < burst.life;
    });
  }

  function update(dt) {
    state.elapsed += dt;
    state.shield = Math.max(0, state.shield - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.shake = Math.max(0, state.shake - dt);

    updatePlayer(dt);
    updateItems(dt);
    updateHud();

    if (state.elapsed >= ROUND_SECONDS) {
      finishGame();
      updateHud();
    }
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, "#061528");
    gradient.addColorStop(0.52, "#08111f");
    gradient.addColorStop(1, "#020611");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    for (const star of stars) {
      ctx.globalAlpha = 0.25 + star.z * 0.65;
      ctx.fillStyle = star.z > 0.65 ? "#9deaff" : "#d6f5ff";
      ctx.fillRect(star.x, star.y, 1 + star.z * 2, 1 + star.z * 2);
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(88, 214, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let x = ((state.elapsed * -42) % 80) - 80; x < WIDTH + 80; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 130, HEIGHT);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    const { x, y } = state.player;
    const tilt = clamp(state.player.vy / 420, -0.45, 0.45);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    if (state.shield > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_RADIUS + 12 + Math.sin(state.elapsed * 10) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(125, 255, 178, 0.7)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.fillStyle = "#58d6ff";
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(-18, -17);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-18, 17);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#eef7ff";
    ctx.beginPath();
    ctx.arc(3, -4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(-20, -8);
    ctx.lineTo(-36 - Math.random() * 7, 0);
    ctx.lineTo(-20, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPacket(packet) {
    ctx.save();
    ctx.translate(packet.x, packet.y);
    ctx.rotate(packet.spin);
    ctx.fillStyle = "rgba(88, 214, 255, 0.22)";
    ctx.strokeStyle = "#58d6ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-packet.r, -packet.r * 0.72, packet.r * 2, packet.r * 1.44, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#eef7ff";
    ctx.font = "800 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(packet.mb, 0, 0);
    ctx.restore();
  }

  function drawMalware(malware) {
    ctx.save();
    ctx.translate(malware.x, malware.y + Math.sin(malware.wobble) * 8);
    ctx.rotate(malware.wobble * 0.35);
    ctx.fillStyle = "rgba(255, 95, 115, 0.24)";
    ctx.strokeStyle = "#ff5f73";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 9; i += 1) {
      const angle = (i / 9) * Math.PI * 2;
      const radius = i % 2 === 0 ? malware.r : malware.r * 0.58;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-8, -6, 5, 5);
    ctx.fillRect(5, -6, 5, 5);
    ctx.restore();
  }

  function drawShield(shield) {
    const pulse = Math.sin(shield.pulse) * 4;
    ctx.save();
    ctx.translate(shield.x, shield.y);
    ctx.strokeStyle = "#7dffb2";
    ctx.fillStyle = "rgba(125, 255, 178, 0.18)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, shield.r + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#7dffb2";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(14, -7);
    ctx.lineTo(9, 13);
    ctx.lineTo(0, 19);
    ctx.lineTo(-9, 13);
    ctx.lineTo(-14, -7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBursts() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 18px system-ui, sans-serif";
    for (const burst of state.bursts) {
      const t = burst.age / burst.life;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = burst.color;
      ctx.fillText(burst.text, burst.x, burst.y - t * 14);
    }
    ctx.restore();
  }

  function drawCacheBar() {
    const barWidth = 250;
    const x = 28;
    const y = HEIGHT - 34;
    const fill = clamp(state.cache / CACHE_LIMIT, 0, 1);

    ctx.save();
    ctx.fillStyle = "rgba(238, 247, 255, 0.12)";
    ctx.fillRect(x, y, barWidth, 12);
    ctx.fillStyle = state.cache >= CACHE_LIMIT - 4 ? "#ffd166" : "#58d6ff";
    ctx.fillRect(x, y, barWidth * fill, 12);
    ctx.strokeStyle = "rgba(238, 247, 255, 0.35)";
    ctx.strokeRect(x, y, barWidth, 12);
    ctx.fillStyle = "#eef7ff";
    ctx.font = "800 13px system-ui, sans-serif";
    ctx.fillText("20MB cache", x, y - 8);
    ctx.restore();
  }

  function render() {
    ctx.save();
    if (state.shake > 0) {
      ctx.translate(rand(-5, 5) * state.shake * 4, rand(-5, 5) * state.shake * 4);
    }

    drawBackground();
    for (const shield of state.shields) drawShield(shield);
    for (const packet of state.packets) drawPacket(packet);
    for (const malware of state.malware) drawMalware(malware);
    drawPlayer();
    drawBursts();
    drawCacheBar();

    if (state.flash > 0) {
      ctx.globalAlpha = state.flash * 1.8;
      ctx.fillStyle = "#7dffb2";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    ctx.restore();
  }

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return {
      x: clamp(((source.clientX - rect.left) / rect.width) * WIDTH, 0, WIDTH),
      y: clamp(((source.clientY - rect.top) / rect.height) * HEIGHT, 0, HEIGHT),
    };
  }

  function setPointer(event) {
    const point = pointFromEvent(event);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.active = true;
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"].includes(key)) {
      event.preventDefault();
      keys.add(key);
      if (state.mode !== "running") resetGame();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  canvas.addEventListener("pointerdown", (event) => {
    setPointer(event);
    canvas.setPointerCapture(event.pointerId);
    if (state.mode !== "running") resetGame();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (pointer.active) setPointer(event);
  });

  canvas.addEventListener("pointerup", () => {
    pointer.active = false;
  });

  canvas.addEventListener("pointercancel", () => {
    pointer.active = false;
  });

  startButton.addEventListener("click", resetGame);

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
    lastTime = now;

    if (state.mode === "running") {
      update(dt);
    } else {
      for (const star of stars) {
        star.x -= (12 + star.z * 22) * dt;
        if (star.x < -4) star.x = WIDTH + 4;
      }
    }

    render();
    requestAnimationFrame(loop);
  }

  updateHud();
  requestAnimationFrame(loop);
})();
