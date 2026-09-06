import { clamp } from './util.js';
import { drawWaveform } from './draw/waveform.js';

// Sources de signal pour la forme d'onde du premier plan. Contrat commun : { ready, sample(n, t) → Float32Array(n) }.

// Signal audio en direct : mémoire circulaire des crêtes du signal temporel, une valeur signée par groupe d'échantillons
export class RingWaveSource {
  constructor(size = 900, perBlock = 30) { this.buf = new Float32Array(size); this.size = size; this.perBlock = perBlock; this.head = 0; this.count = 0; }
  get ready() { return this.count >= this.size / 3; }
  push(samples) {
    const g = Math.max(1, Math.floor(samples.length / this.perBlock));
    for (let b = 0; b < this.perBlock; b++) {
      let peak = 0;
      for (let i = b * g; i < Math.min(samples.length, (b + 1) * g); i++) if (Math.abs(samples[i]) > Math.abs(peak)) peak = samples[i];
      this.buf[this.head] = peak; this.head = (this.head + 1) % this.size; this.count = Math.min(this.size, this.count + 1);
    }
  }
  sample(n) {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) { const k = n - 1 - i; out[i] = k < this.count ? this.buf[(this.head - 1 - k + this.size * 2) % this.size] : 0; }
    return out;
  }
}

// Repli sans son accessible : enveloppe des crêtes précalculées sur une fenêtre centrée sur l'instant présent
export class EnvelopeWaveSource {
  constructor(analysis, windowSec = 3) { this.a = analysis; this.win = windowSec; }
  get ready() { return true; }
  sample(n, t) {
    const out = new Float32Array(n), a = this.a;
    for (let i = 0; i < n; i++) {
      const tt = t - this.win / 2 + (i / (n - 1)) * this.win;
      out[i] = tt >= 0 && tt <= a.duration ? clamp(Math.pow(10, a.at(a.PK, tt) / 20), 0, 1) : 0;
    }
    return out;
  }
}

// Le bandeau : choisit la meilleure source disponible et délègue le rendu
export class WaveformStrip {
  constructor(liveSource, envelopeSource, points = 240) { this.live = liveSource; this.env = envelopeSource; this.points = points; }
  render(ctx, box, t, hue) {
    const useLive = this.live && this.live.ready;
    const src = useLive ? this.live : this.env;
    drawWaveform(ctx, src.sample(this.points, t), box, { mode: useLive ? 'signal' : 'envelope', hue });
  }
}
