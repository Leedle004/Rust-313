// Procedural sound effects via the Web Audio API (no asset files needed).
const Sound = (() => {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }

  // Browsers require a user gesture before audio can play.
  function unlock() {
    ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function tone({ freq = 440, type = "square", dur = 0.12, vol = 0.4, slide = 0 }) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur);
  }

  function noise({ dur = 0.3, vol = 0.5 }) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + dur);
  }

  return {
    unlock,
    setMuted: (m) => (muted = m),
    isMuted: () => muted,
    shoot: () => tone({ freq: 760, type: "square", dur: 0.08, vol: 0.18, slide: -300 }),
    enemyShoot: () => tone({ freq: 300, type: "sawtooth", dur: 0.1, vol: 0.12, slide: -120 }),
    explosion: () => noise({ dur: 0.35, vol: 0.4 }),
    hit: () => tone({ freq: 180, type: "square", dur: 0.1, vol: 0.25, slide: -80 }),
    powerup: () => {
      tone({ freq: 520, type: "triangle", dur: 0.1, vol: 0.3 });
      setTimeout(() => tone({ freq: 780, type: "triangle", dur: 0.12, vol: 0.3 }), 90);
    },
    bomb: () => {
      noise({ dur: 0.6, vol: 0.6 });
      tone({ freq: 90, type: "sawtooth", dur: 0.5, vol: 0.4, slide: -50 });
    },
    wave: () => {
      tone({ freq: 440, type: "triangle", dur: 0.12, vol: 0.25 });
      setTimeout(() => tone({ freq: 660, type: "triangle", dur: 0.16, vol: 0.25 }), 120);
    },
    gameover: () => {
      tone({ freq: 400, type: "sawtooth", dur: 0.25, vol: 0.3, slide: -200 });
      setTimeout(() => tone({ freq: 200, type: "sawtooth", dur: 0.4, vol: 0.3, slide: -120 }), 200);
    },
  };
})();
