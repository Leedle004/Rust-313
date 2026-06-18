// Lightweight procedural sound effects via the Web Audio API.
// No external assets needed; everything is synthesized on the fly.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }

  // Must be created after a user gesture (browser autoplay policy).
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  _tone({ type = "sine", freq = 440, freqEnd = null, duration = 0.12, gain = 0.5, delay = 0 }) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  _noise({ duration = 0.2, gain = 0.4, delay = 0, filterFreq = 1200 }) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const frames = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  shoot() { this._tone({ type: "square", freq: 880, freqEnd: 440, duration: 0.08, gain: 0.18 }); }
  enemyShoot() { this._tone({ type: "sawtooth", freq: 300, freqEnd: 160, duration: 0.12, gain: 0.12 }); }
  explosion() { this._noise({ duration: 0.32, gain: 0.5, filterFreq: 900 }); }
  bigExplosion() {
    this._noise({ duration: 0.6, gain: 0.7, filterFreq: 600 });
    this._tone({ type: "sine", freq: 120, freqEnd: 40, duration: 0.5, gain: 0.4 });
  }
  powerup() {
    this._tone({ type: "triangle", freq: 520, freqEnd: 1040, duration: 0.18, gain: 0.3 });
    this._tone({ type: "triangle", freq: 780, freqEnd: 1560, duration: 0.18, gain: 0.2, delay: 0.06 });
  }
  hit() { this._tone({ type: "square", freq: 200, freqEnd: 80, duration: 0.18, gain: 0.35 }); }
  levelUp() {
    [440, 554, 659, 880].forEach((f, i) =>
      this._tone({ type: "triangle", freq: f, duration: 0.14, gain: 0.25, delay: i * 0.09 }));
  }
}
