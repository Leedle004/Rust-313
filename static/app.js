// AI 币圈 OS —— 前端桌面环境（窗口管理 + 各 App 渲染）。

"use strict";

// ---------------- App 注册表 ----------------
const APPS = {
  ai:        { glyph: "🤖", title: "AI 助手",  w: 440, h: 560, render: renderAI },
  market:    { glyph: "📈", title: "行情",     w: 720, h: 520, render: renderMarket },
  signals:   { glyph: "🎯", title: "AI 信号",  w: 480, h: 560, render: renderSignals },
  portfolio: { glyph: "💼", title: "资产",     w: 560, h: 480, render: renderPortfolio },
  news:      { glyph: "📰", title: "资讯",     w: 460, h: 520, render: renderNews },
  about:     { glyph: "ℹ️", title: "关于本系统", w: 480, h: 440, render: renderAbout },
};

let zCounter = 10;
const openWindows = new Map(); // id -> { el, app }

// ---------------- 启动 ----------------
window.addEventListener("DOMContentLoaded", () => {
  buildLauncher();
  startClock();
  startTickerStrip();

  setTimeout(() => {
    const boot = document.getElementById("boot");
    boot.style.opacity = "0";
    setTimeout(() => boot.classList.add("hidden"), 600);
    document.getElementById("desktop").classList.remove("hidden");
    // 默认打开 AI 助手与行情
    openApp("ai");
    openApp("market");
  }, 1900);
});

// ---------------- 启动器（桌面图标 + Dock） ----------------
function buildLauncher() {
  const icons = document.getElementById("desktop-icons");
  const dock = document.getElementById("dock");
  for (const [id, app] of Object.entries(APPS)) {
    const di = document.createElement("div");
    di.className = "desktop-icon";
    di.innerHTML = `<div class="glyph">${app.glyph}</div><div class="label">${app.title}</div>`;
    di.onclick = () => openApp(id);
    icons.appendChild(di);

    const dk = document.createElement("div");
    dk.className = "dock-icon";
    dk.id = `dock-${id}`;
    dk.title = app.title;
    dk.textContent = app.glyph;
    dk.onclick = () => openApp(id);
    dock.appendChild(dk);
  }
}

// ---------------- 时钟 ----------------
function startClock() {
  const el = document.getElementById("clock");
  const tick = () => {
    const d = new Date();
    el.textContent = d.toLocaleTimeString("zh-CN", { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

// ---------------- 顶部行情滚动条 + 情绪 ----------------
function startTickerStrip() {
  const strip = document.getElementById("ticker-strip");
  const badge = document.getElementById("sentiment-badge");
  const refresh = async () => {
    try {
      const coins = await fetchJSON("/api/market");
      strip.innerHTML = coins
        .slice(0, 8)
        .map((c) => {
          const cls = c.change_24h >= 0 ? "up" : "down";
          const sign = c.change_24h >= 0 ? "▲" : "▼";
          return `<span class="tick"><b>${c.symbol}</b> <span>$${fmt(c.price)}</span> <span class="${cls}">${sign}${Math.abs(c.change_24h).toFixed(2)}%</span></span>`;
        })
        .join("");

      const avg = coins.reduce((s, c) => s + c.change_24h, 0) / coins.length;
      let label = "🟡 中性", n = avg.toFixed(2);
      if (avg > 2) label = "🟢 贪婪";
      else if (avg < -2) label = "🔴 恐慌";
      badge.textContent = `情绪 ${label} (${n > 0 ? "+" : ""}${n}%)`;
    } catch (e) {
      strip.innerHTML = `<span class="muted">行情连接中…</span>`;
    }
  };
  refresh();
  setInterval(refresh, 3000);
}

// ---------------- 窗口管理 ----------------
function openApp(id) {
  if (openWindows.has(id)) {
    focusWindow(openWindows.get(id).el);
    openWindows.get(id).el.classList.remove("hidden");
    return;
  }
  const app = APPS[id];
  const el = createWindow(id, app);
  document.getElementById("windows").appendChild(el);
  openWindows.set(id, { el, app });
  document.getElementById(`dock-${id}`)?.classList.add("active");
  focusWindow(el);

  const body = el.querySelector(".win-body");
  app.render(body, el);
}

function createWindow(id, app) {
  const el = document.createElement("div");
  el.className = "window";
  el.dataset.id = id;

  // 错落摆放
  const offset = openWindows.size * 28;
  el.style.width = app.w + "px";
  el.style.height = app.h + "px";
  el.style.left = Math.min(120 + offset, window.innerWidth - app.w - 40) + "px";
  el.style.top = Math.min(70 + offset, window.innerHeight - app.h - 80) + "px";

  el.innerHTML = `
    <div class="win-titlebar">
      <div class="win-controls">
        <button class="win-dot close" title="关闭"></button>
        <button class="win-dot min" title="最小化"></button>
        <button class="win-dot max" title="最大化"></button>
      </div>
      <div class="win-title"><span class="glyph">${app.glyph}</span>${app.title}</div>
    </div>
    <div class="win-body"></div>
  `;

  el.addEventListener("mousedown", () => focusWindow(el));

  el.querySelector(".close").onclick = (e) => { e.stopPropagation(); closeWindow(id); };
  el.querySelector(".min").onclick = (e) => { e.stopPropagation(); el.classList.add("hidden"); };
  el.querySelector(".max").onclick = (e) => { e.stopPropagation(); toggleMax(el, app); };

  makeDraggable(el, el.querySelector(".win-titlebar"));
  return el;
}

function focusWindow(el) {
  el.style.zIndex = ++zCounter;
}

function closeWindow(id) {
  const w = openWindows.get(id);
  if (!w) return;
  if (w.cleanup) w.cleanup();
  w.el.remove();
  openWindows.delete(id);
  document.getElementById(`dock-${id}`)?.classList.remove("active");
}

function toggleMax(el, app) {
  if (el.classList.contains("maximized")) {
    el.classList.remove("maximized");
    Object.assign(el.style, el._restore);
  } else {
    el._restore = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
    el.classList.add("maximized");
    Object.assign(el.style, { left: "0px", top: "40px", width: "100vw", height: "calc(100vh - 110px)" });
  }
}

function makeDraggable(el, handle) {
  let sx, sy, ox, oy, dragging = false;
  handle.addEventListener("mousedown", (e) => {
    if (el.classList.contains("maximized")) return;
    dragging = true;
    sx = e.clientX; sy = e.clientY;
    ox = parseInt(el.style.left); oy = parseInt(el.style.top);
    focusWindow(el);
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const nx = Math.max(0, Math.min(window.innerWidth - 80, ox + e.clientX - sx));
    const ny = Math.max(40, Math.min(window.innerHeight - 60, oy + e.clientY - sy));
    el.style.left = nx + "px";
    el.style.top = ny + "px";
  });
  window.addEventListener("mouseup", () => { dragging = false; });
}

// ---------------- 工具函数 ----------------
async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

function fmt(n) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtBig(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
}

function sparkSVG(data, up) {
  if (!data || data.length < 2) return "";
  const w = 90, h = 26, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color = up ? "#16c784" : "#ea3943";
  return `<svg class="spark" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${color}" stroke-width="1.5" points="${pts.join(" ")}"/></svg>`;
}

function registerPoll(id, fn, ms) {
  const timer = setInterval(fn, ms);
  const w = openWindows.get(id);
  if (w) w.cleanup = () => clearInterval(timer);
}

// ---------------- App：行情 ----------------
function renderMarket(body, el) {
  body.innerHTML = `<table>
    <thead><tr><th>币种</th><th>价格(USD)</th><th>24h</th><th>走势</th><th>成交额</th></tr></thead>
    <tbody id="mkt-rows"><tr><td colspan="5" class="muted">加载中…</td></tr></tbody>
  </table>`;
  const rows = body.querySelector("#mkt-rows");
  const update = async () => {
    try {
      const coins = await fetchJSON("/api/market");
      rows.innerHTML = coins.map((c) => {
        const up = c.change_24h >= 0;
        const cls = up ? "up" : "down";
        const sign = up ? "+" : "";
        return `<tr>
          <td><div class="coin-name"><b>${c.symbol}</b><span>${c.name}</span></div></td>
          <td>$${fmt(c.price)}</td>
          <td class="${cls}">${sign}${c.change_24h.toFixed(2)}%</td>
          <td>${sparkSVG(c.spark, up)}</td>
          <td class="muted">$${fmtBig(c.volume_24h)}</td>
        </tr>`;
      }).join("");
    } catch (e) {
      rows.innerHTML = `<tr><td colspan="5" class="muted">行情加载失败</td></tr>`;
    }
  };
  update();
  registerPoll("market", update, 2500);
}

// ---------------- App：AI 助手 ----------------
function renderAI(body) {
  body.innerHTML = `
    <div class="chat">
      <div class="suggestions">
        <span class="chip">BTC 现在多少钱</span>
        <span class="chip">大盘行情如何</span>
        <span class="chip">什么是 DCA</span>
        <span class="chip">现在适合抄底吗</span>
      </div>
      <div class="chat-log" id="chat-log"></div>
      <div class="chat-input">
        <input id="chat-text" placeholder="问问 AI：行情 / 名词 / 风险…" />
        <button class="btn" id="chat-send">发送</button>
      </div>
    </div>`;

  const log = body.querySelector("#chat-log");
  const input = body.querySelector("#chat-text");
  const send = body.querySelector("#chat-send");

  const addMsg = (text, who) => {
    const m = document.createElement("div");
    m.className = "msg " + who;
    m.textContent = text;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  };

  addMsg("你好 👋 我是 AI 币圈助手。可以问我实时行情、名词解释、风险与操作思路。", "bot");

  const submit = async () => {
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, "user");
    input.value = "";
    const pending = addMsg("思考中…", "bot");
    try {
      const data = await fetchJSON("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      pending.textContent = data.reply;
    } catch (e) {
      pending.textContent = "抱歉，连接 AI 服务失败。";
    }
    log.scrollTop = log.scrollHeight;
  };

  send.onclick = submit;
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  body.querySelectorAll(".chip").forEach((chip) => {
    chip.onclick = () => { input.value = chip.textContent; submit(); };
  });
}

// ---------------- App：AI 信号 ----------------
function renderSignals(body) {
  body.innerHTML = `<p class="muted" style="margin-bottom:10px;font-size:12px">基于实时行情的启发式信号，仅供参考，非投资建议。</p><div id="sig-list" class="muted">加载中…</div>`;
  const list = body.querySelector("#sig-list");
  const clsMap = {
    "强烈看多": "act-strong-long", "看多": "act-long", "中性": "act-neutral",
    "看空": "act-short", "强烈看空": "act-strong-short",
  };
  const update = async () => {
    try {
      const sigs = await fetchJSON("/api/signals");
      list.innerHTML = sigs.map((s) => `
        <div class="signal">
          <div style="flex:1">
            <div class="row"><b>${s.symbol}</b> <span class="muted">$${fmt(s.price)}</span></div>
            <div class="muted" style="font-size:12px;margin-top:2px">${s.rationale}</div>
            <div class="conf-bar"><i style="width:${s.confidence}%"></i></div>
            <div class="muted" style="font-size:11px;margin-top:3px">置信度 ${s.confidence}%</div>
          </div>
          <span class="act ${clsMap[s.action] || "act-neutral"}">${s.action}</span>
        </div>`).join("");
    } catch (e) {
      list.innerHTML = `<span class="muted">信号加载失败</span>`;
    }
  };
  update();
  registerPoll("signals", update, 3000);
}

// ---------------- App：资产 ----------------
function renderPortfolio(body) {
  body.innerHTML = `<div id="pf-stats" class="stat-grid"></div>
    <table>
      <thead><tr><th>币种</th><th>持仓</th><th>成本</th><th>现价</th><th>市值</th><th>盈亏</th></tr></thead>
      <tbody id="pf-rows"><tr><td colspan="6" class="muted">加载中…</td></tr></tbody>
    </table>`;
  const stats = body.querySelector("#pf-stats");
  const rows = body.querySelector("#pf-rows");
  const update = async () => {
    try {
      const d = await fetchJSON("/api/portfolio");
      const pnlCls = d.total_pnl >= 0 ? "up" : "down";
      const sign = d.total_pnl >= 0 ? "+" : "";
      stats.innerHTML = `
        <div class="stat"><div class="k">总市值</div><div class="v">$${fmt(d.total_value)}</div></div>
        <div class="stat"><div class="k">总盈亏</div><div class="v ${pnlCls}">${sign}$${fmt(d.total_pnl)} (${sign}${d.total_pnl_pct.toFixed(2)}%)</div></div>`;
      rows.innerHTML = d.positions.map((p) => {
        const c = p.pnl >= 0 ? "up" : "down";
        const s = p.pnl >= 0 ? "+" : "";
        return `<tr>
          <td><b>${p.symbol}</b></td>
          <td>${fmt(p.amount)}</td>
          <td class="muted">$${fmt(p.avg_cost)}</td>
          <td>$${fmt(p.price)}</td>
          <td>$${fmt(p.value)}</td>
          <td class="${c}">${s}$${fmt(p.pnl)}<br><span style="font-size:11px">${s}${p.pnl_pct.toFixed(2)}%</span></td>
        </tr>`;
      }).join("");
    } catch (e) {
      rows.innerHTML = `<tr><td colspan="6" class="muted">资产加载失败</td></tr>`;
    }
  };
  update();
  registerPoll("portfolio", update, 2500);
}

// ---------------- App：资讯 ----------------
function renderNews(body) {
  body.innerHTML = `<div id="news-list" class="muted">加载中…</div>`;
  const list = body.querySelector("#news-list");
  const update = async () => {
    try {
      const items = await fetchJSON("/api/news");
      list.innerHTML = items.map((n) => `
        <div class="news-item">
          <div class="title">${n.title}</div>
          <div class="news-meta">
            <span class="pill">${n.tag}</span>
            <span>${n.source}</span>
            <span>· ${n.minutes_ago} 分钟前</span>
          </div>
        </div>`).join("");
    } catch (e) {
      list.innerHTML = `<span class="muted">资讯加载失败</span>`;
    }
  };
  update();
  registerPoll("news", update, 15000);
}

// ---------------- App：关于 ----------------
function renderAbout(body) {
  body.innerHTML = `
    <div class="about">
      <h3>🪙 AI 币圈 OS</h3>
      <p>一个运行在浏览器里的「币圈操作系统」：以多窗口桌面环境聚合 AI 助手、实时行情、AI 信号、资产管理与资讯。</p>
      <p><b>技术栈：</b>Rust + Axum（单一可执行文件后端）+ 原生 Web 前端，零外部依赖、完全离线运行。</p>
      <p><b>内置 App：</b><br>🤖 AI 助手　📈 行情　🎯 AI 信号　💼 资产　📰 资讯</p>
      <p><b>API：</b><br><code>GET /api/market</code><br><code>POST /api/chat</code><br><code>GET /api/signals</code><br><code>GET /api/portfolio</code><br><code>GET /api/news</code></p>
      <p style="color:var(--red)">⚠️ 所有行情与信号均为本地模拟数据，仅用于演示，绝不构成任何投资建议。</p>
    </div>`;
}
