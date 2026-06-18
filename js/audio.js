// Lightweight synthesized sound effects via the Web Audio API.
// No external assets required — everything is generated on the fly.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }

  // Must be called from a user gesture (browsers block autoplay otherwise).
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      this.enabled = false;
      return;
    }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  _tone({ freq = 440, type = "sine", dur = 0.15, gain = 0.5, slideTo = null }) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise({ dur = 0.25, gain = 0.5, freq = 800 }) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }

  shoot() {
    this._tone({ freq: 720, slideTo: 220, type: "square", dur: 0.12, gain: 0.18 });
  }

  enemyShoot() {
    this._tone({ freq: 300, slideTo: 120, type: "sawtooth", dur: 0.16, gain: 0.12 });
  }

  hit() {
    this._tone({ freq: 180, slideTo: 90, type: "triangle", dur: 0.1, gain: 0.2 });
  }

  explosion() {
    this._noise({ dur: 0.35, gain: 0.45, freq: 1200 });
    this._tone({ freq: 120, slideTo: 40, type: "sawtooth", dur: 0.3, gain: 0.2 });
  }

  powerup() {
    this._tone({ freq: 440, slideTo: 880, type: "sine", dur: 0.18, gain: 0.3 });
    this._tone({ freq: 660, slideTo: 1320, type: "sine", dur: 0.22, gain: 0.2 });
  }

  playerHit() {
    this._noise({ dur: 0.4, gain: 0.5, freq: 600 });
    this._tone({ freq: 200, slideTo: 60, type: "square", dur: 0.4, gain: 0.25 });
  }

  wave() {
    this._tone({ freq: 523, type: "sine", dur: 0.15, gain: 0.25 });
    this._tone({ freq: 784, type: "sine", dur: 0.2, gain: 0.2 });
  }

  gameOver() {
    this._tone({ freq: 440, slideTo: 110, type: "sawtooth", dur: 0.9, gain: 0.3 });
  }
}

export const audio = new AudioEngine();
