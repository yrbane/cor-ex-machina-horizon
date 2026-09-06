import { clamp, pct } from './util.js';

export const BANDS = ['sub', 'bass', 'mid', 'high'];

// Données précalculées du set (loudness et bandes toutes les 0,5 s) avec interpolation et normalisation
export class Analysis {
  constructor({ rows, meta }) {
    this.step = meta.step; this.duration = meta.duration; this.meta = meta;
    const col = n => meta.cols.indexOf(n);
    this.S = rows.map(r => Math.max(-40, r[col('S')]));   // silence plafonné : le paysage n'a pas besoin de descendre plus bas
    this.M = rows.map(r => r[col('M')]);
    this.PK = rows.map(r => r[col('peak')]);
    this.bands = Object.fromEntries(BANDS.map(b => [b, rows.map(r => r[col(b)])]));
    this.range = Object.fromEntries(BANDS.map(b => [b, [pct(this.bands[b], .05), pct(this.bands[b], .95)]]));
  }
  // Valeur interpolée d'une série à l'instant t (secondes)
  at(arr, t) {
    const i = clamp(t / this.step, 0, arr.length - 1), i0 = Math.floor(i), i1 = Math.min(arr.length - 1, i0 + 1), f = i - i0;
    return arr[i0] + (arr[i1] - arr[i0]) * f;
  }
  norm(b, v) { const [lo, hi] = this.range[b]; return clamp((v - lo) / (hi - lo), 0, 1); }
  bandsAt(t) { return Object.fromEntries(BANDS.map(b => [b, this.norm(b, this.at(this.bands[b], t))])); }
  // Niveau 0…1 : -30…-6 LUFS
  levelAt(t) { return clamp((this.at(this.S, t) + 30) / 24, 0, 1); }
}

// Détection des coups de sub sur l'énergie basse en temps réel : bouffée au-dessus de la moyenne glissante, temps mort
export class KickDetector {
  constructor({ ratio = 1.6, hold = .22 } = {}) { this.ema = 0; this.last = -9; this.ratio = ratio; this.hold = hold; }
  feed(e, t) {
    if (e <= 0) return 0;
    this.ema = this.ema ? this.ema * .985 + e * .015 : e;
    const r = e / (this.ema + 1e-12);
    if (r > this.ratio && t - this.last > this.hold) { this.last = t; return clamp((r - this.ratio) / 2, .25, 1); }
    return 0;
  }
}

// Repli sans son accessible : une montée nette du sub entre deux échantillons vaut un coup
export class DataKick {
  constructor(analysis) { this.a = analysis; this.prev = 0; this.lastStep = -1; }
  at(t) {
    const step = Math.floor(t / this.a.step); if (step === this.lastStep) return 0; this.lastStep = step;
    const v = this.a.norm('sub', this.a.at(this.a.bands.sub, t)), d = v - this.prev; this.prev = v;
    return d > .12 ? clamp(d * 3, .25, 1) : 0;
  }
}
