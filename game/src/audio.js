// Solara Bay v17 — audio engine (synth SFX, radio, sirens)
// Synthesised audio — no audio files. Engine hum, two-tone siren, gunshots,
// UI beeps and a tiny radio sequencer, all built with the Web Audio API.
export class SynthAudio {
  constructor() {
    this.ctx = null; this.master = null; this.engineOsc = null; this.engineGain = null;
    this.sirenOn = false; this.sirenTimer = null; this.radioTimer = null;
    this.muted = false; this.started = false;
  }
  ensure() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      // Engine: sawtooth + lowpass, pitch follows speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 55;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 420;
      this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0.0;
      this.engineOsc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
      this.started = true;
    } catch (e) { /* audio unavailable (headless) — game plays silent */ }
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setEngine(speed01, driving) {
    if (!this.started) return;
    this.engineOsc.frequency.value = 52 + speed01 * 165;
    this.engineGain.gain.value = driving ? 0.05 + speed01 * 0.07 : 0.02;
  }
  setSiren(on) {
    if (!this.started || on === this.sirenOn) return;
    this.sirenOn = on;
    if (on) {
      let hi = false;
      this.sirenTimer = setInterval(() => {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'sine'; o.frequency.value = hi ? 920 : 660; hi = !hi;
        g.gain.setValueAtTime(0.05, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.42);
        o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime + 0.45);
      }, 430);
    } else if (this.sirenTimer) { clearInterval(this.sirenTimer); this.sirenTimer = null; }
  }
  gunshot() {
    if (!this.started) return;
    const dur = 0.14, buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = 0.5;
    src.connect(g); g.connect(this.master); src.start();
  }
  beep(freq = 880, dur = 0.08) {
    if (!this.started) return;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.08, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime + dur);
  }
  // Tiny radio loop: a sunny synthwave bassline + hats, sequenced on a timer.
  startRadio() {
    if (!this.started || this.radioTimer) return;
    const notes = [55, 0, 65.4, 0, 49, 0, 58.3, 0, 55, 0, 65.4, 0, 73.4, 82.4, 0, 0];
    let i = 0;
    this.radioTimer = setInterval(() => {
      const f = notes[i % notes.length]; i++;
      if (!f || !this.ctx) return;
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.06, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
      o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime + 0.24);
    }, 240);
  }
  stopRadio() { if (this.radioTimer) { clearInterval(this.radioTimer); this.radioTimer = null; } }
}
