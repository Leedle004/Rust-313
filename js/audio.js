/* Nebula Strike — procedural audio engine via the Web Audio API.
   All sound effects and the music are synthesized at runtime, so the game
   ships with zero audio asset files. */
(function (global) {
  "use strict";

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.muted = Utils.loadMuted();
      this.musicTimer = null;
      this.musicStep = 0;
      this.tempo = 0.26; // seconds per step
      // A minor pentatonic-ish bassline + lead for an upbeat arcade vibe.
      this.bass = [55.0, 55.0, 82.41, 73.42, 65.41, 65.41, 98.0, 82.41];
      this.lead = [440, 523, 659, 587, 523, 440, 392, 523];
    }

    // Must be triggered by a user gesture (browser autoplay policy).
    ensure() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume();
        return;
      }
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.master);
    }

    setMuted(m) {
      this.muted = m;
      Utils.saveMuted(m);
      if (this.master) {
        this.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
      }
    }

    toggleMute() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    // Core voice: an oscillator with an ADSR-ish gain envelope.
    tone(opts) {
      if (!this.ctx || this.muted) return;
      const {
        freq = 440,
        type = "square",
        dur = 0.15,
        vol = 0.3,
        attack = 0.005,
        decay = 0.05,
        glideTo = null,
        dest = this.master,
      } = opts;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + decay);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + dur + decay + 0.02);
    }

    // White-noise burst (explosions / hits).
    noise(opts) {
      if (!this.ctx || this.muted) return;
      const { dur = 0.25, vol = 0.4, freq = 1200, q = 1 } = opts;
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.setValueAtTime(freq, t);
      filt.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.15), t + dur);
      filt.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filt);
      filt.connect(g);
      g.connect(this.master);
      src.start(t);
      src.stop(t + dur);
    }

    /* ---------- Named SFX ---------- */
    shoot() {
      this.tone({ freq: 880, glideTo: 420, type: "square", dur: 0.07, vol: 0.12, decay: 0.02 });
    }
    enemyShoot() {
      this.tone({ freq: 220, glideTo: 140, type: "sawtooth", dur: 0.1, vol: 0.1, decay: 0.03 });
    }
    hit() {
      this.noise({ dur: 0.08, vol: 0.18, freq: 2200, q: 0.6 });
    }
    explosion() {
      this.noise({ dur: 0.4, vol: 0.5, freq: 1400, q: 1.2 });
      this.tone({ freq: 90, glideTo: 40, type: "triangle", dur: 0.3, vol: 0.3 });
    }
    bigExplosion() {
      this.noise({ dur: 0.9, vol: 0.6, freq: 1100, q: 1.5 });
      this.tone({ freq: 70, glideTo: 28, type: "triangle", dur: 0.7, vol: 0.4 });
    }
    powerup() {
      this.tone({ freq: 520, glideTo: 880, type: "sine", dur: 0.12, vol: 0.25 });
      setTimeout(() => this.tone({ freq: 780, glideTo: 1180, type: "sine", dur: 0.12, vol: 0.22 }), 70);
    }
    dash() {
      this.tone({ freq: 300, glideTo: 900, type: "sawtooth", dur: 0.18, vol: 0.18 });
    }
    playerHurt() {
      this.tone({ freq: 200, glideTo: 60, type: "square", dur: 0.35, vol: 0.32 });
      this.noise({ dur: 0.3, vol: 0.3, freq: 900 });
    }
    waveClear() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => setTimeout(() => this.tone({ freq: f, type: "triangle", dur: 0.16, vol: 0.22 }), i * 90));
    }
    gameOver() {
      const notes = [440, 392, 330, 262];
      notes.forEach((f, i) => setTimeout(() => this.tone({ freq: f, type: "sawtooth", dur: 0.3, vol: 0.28 }), i * 180));
    }
    uiClick() {
      this.tone({ freq: 660, type: "square", dur: 0.05, vol: 0.12 });
    }

    /* ---------- Background music sequencer ---------- */
    startMusic() {
      if (!this.ctx || this.musicTimer) return;
      this.musicStep = 0;
      const tick = () => {
        if (!this.muted) {
          const i = this.musicStep % this.bass.length;
          this.tone({ freq: this.bass[i], type: "triangle", dur: 0.22, vol: 0.18, dest: this.musicGain });
          if (this.musicStep % 2 === 0) {
            this.tone({ freq: this.lead[i], type: "square", dur: 0.16, vol: 0.07, dest: this.musicGain });
          }
          if (this.musicStep % 4 === 2) {
            this.noise({ dur: 0.05, vol: 0.06, freq: 6000 }); // hat
          }
        }
        this.musicStep++;
        this.musicTimer = setTimeout(tick, this.tempo * 1000);
      };
      tick();
    }

    stopMusic() {
      if (this.musicTimer) {
        clearTimeout(this.musicTimer);
        this.musicTimer = null;
      }
    }
  }

  global.audio = new AudioEngine();
})(window);
