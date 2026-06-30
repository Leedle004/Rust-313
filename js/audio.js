/* Nebula Strike — procedural sound via Web Audio API.
   No audio files needed, so the whole game stays tiny. */
(function (global) {
  "use strict";

  let ctx = null;
  let master = null;
  let muted = U.storage.get("ns_muted", false);

  function ensure() {
    if (ctx) return;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }

  // a single oscillator "blip"
  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  // filtered noise burst (explosions / hits)
  function noise(dur, vol, freq) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq || 1200, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur);
  }

  const Audio = {
    init() { ensure(); },
    resume() { ensure(); if (ctx && ctx.state === "suspended") ctx.resume(); },
    shoot() { tone(880, 0.08, "square", 0.12, 440); },
    enemyShoot() { tone(220, 0.12, "sawtooth", 0.1, 120); },
    explode() { noise(0.35, 0.45, 1600); },
    bigExplode() { noise(0.7, 0.6, 900); tone(80, 0.5, "sawtooth", 0.25, 40); },
    hit() { tone(160, 0.15, "square", 0.25, 60); noise(0.15, 0.2, 600); },
    powerup() { tone(523, 0.1, "triangle", 0.25); setTimeout(() => tone(784, 0.14, "triangle", 0.25), 90); },
    bomb() { noise(0.9, 0.6, 2200); tone(120, 0.8, "sine", 0.3, 30); },
    levelup() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, "triangle", 0.22), i * 110)); },
    gameover() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, "sawtooth", 0.25), i * 200)); },
    click() { tone(660, 0.06, "square", 0.15); },
    toggleMute() {
      muted = !muted;
      U.storage.set("ns_muted", muted);
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; }
  };

  global.Audio = Audio;
})(window);
