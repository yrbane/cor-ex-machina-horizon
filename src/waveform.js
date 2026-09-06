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

// Repli sans son accessible : un signal synthétique, somme de sinus liés au temps du morceau, modulé par les crêtes
// précalculées. Il défile en temps réel et respire avec le set, sans prétendre être le vrai signal.
export class EnvelopeWaveSource {
  constructor(analysis, windowSec = 3) { this.a = analysis; this.win = windowSec; }
  get ready() { return true; }
  sample(n, t) {
    const out = new Float32Array(n), a = this.a, TAU = Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const tt = t - this.win / 2 + (i / (n - 1)) * this.win;
      if (tt < 0 || tt > a.duration) continue;
      const env = clamp((Math.pow(10, a.at(a.PK, tt) / 20) - .15) / .85, 0, 1);
      out[i] = env * (.55 * Math.sin(tt * TAU * 11) + .3 * Math.sin(tt * TAU * 23.7 + 1) + .15 * Math.sin(tt * TAU * 5.3 + 2));
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
    drawWaveform(ctx, src.sample(this.points, t), box, { mode: 'signal', hue });
  }
}
