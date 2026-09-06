import { clamp, pct } from './util.js';
import { BANDS } from './analysis.js';

// Analyse construite en direct pour un morceau inconnu : même interface que Analysis, remplie au fil de la lecture.
// Le paysage se dessine donc à mesure que le morceau est entendu ; la droite de l'écran reste vide tant que l'avenir est inconnu.
export class LiveAnalysis {
  constructor(step = .5) { this.step = step; this.meta = { I: -14, LRA: 0, TP: 0, step }; this.reset(); }
  reset() { this.S = []; this.M = []; this.PK = []; this.bands = Object.fromEntries(BANDS.map(b => [b, []])); this.lastStep = -1; this._range = null; this._loud = null; }
  get duration() { return this.S.length * this.step; }
  // Reprend une analyse sauvegardée : les échantillons connus sont conservés, la suite s'ajoute derrière
  load(data) {
    if (!data || !Array.isArray(data.S)) return;
    this.S = data.S.slice(); this.M = (data.M || data.S).slice(); this.PK = (data.PK || data.S.map(() => -3)).slice();
    for (const b of BANDS) this.bands[b] = (data.bands && data.bands[b] ? data.bands[b] : data.S.map(() => .5)).slice();
    this.lastStep = this.S.length - 1; this._loud = [pct(this.S, .05), pct(this.S, .95)];
  }
  // Un échantillon par pas de temps ; loud en dB (relatif), peak en dBFS, bandes déjà normalisées 0…1
  feed(t, { loud, peak, sub, bass, mid, high }) {
    const s = Math.floor(t / this.step); if (s === this.lastStep || s < this.S.length) return; this.lastStep = s;
    do { this.S.push(loud); this.M.push(loud); this.PK.push(peak); this.bands.sub.push(sub); this.bands.bass.push(bass); this.bands.mid.push(mid); this.bands.high.push(high); } while (this.S.length <= s);   // un saut en avant comble le trou
    if (this.S.length % 4 === 0 || !this._loud) this._loud = [pct(this.S, .05), pct(this.S, .95)];
  }
  at(arr, t) {
    if (!arr.length) return -40;
    const i = clamp(t / this.step, 0, arr.length - 1), i0 = Math.floor(i), i1 = Math.min(arr.length - 1, i0 + 1), f = i - i0;
    return arr[i0] + (arr[i1] - arr[i0]) * f;
  }
  norm(b, v) { return clamp(v, 0, 1); }
  bandsAt(t) { return Object.fromEntries(BANDS.map(b => [b, this.norm(b, this.at(this.bands[b], t))])); }
  // Niveau 0…1 relatif à ce qui a déjà été entendu
  levelAt(t) { if (!this._loud) return 0; const [lo, hi] = this._loud; return clamp((this.at(this.S, t) - lo) / Math.max(6, hi - lo), 0, 1); }
}
