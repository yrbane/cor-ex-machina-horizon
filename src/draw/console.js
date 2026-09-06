import { clamp, lerp, fr, tc, mmss, LUF } from '../util.js';
import { WNAME, WCOL, WSEG, pickW } from '../weather.js';
import { skyState } from '../sky.js';
import { TYPES } from '../events.js';

// Console de documentation et de statistiques : graphiques dessinés dans des canvas, rafraîchis quatre fois par seconde
const C = { ink: '#eae7dd', ink2: '#a9aec0', line: 'rgba(255,255,255,.12)', series: '#5aa0f0', sub: '#d95926', bass: '#199e70', mid: '#c98500', high: '#d55181' };

export class Console {
  // getAnalysis renvoie l'analyse de la piste courante : précalculée pour le set, construite en direct sinon
  constructor(doc, getAnalysis, stats, opts) {
    this.$ = id => doc.getElementById(id); this.getA = getAnalysis; this.stats = stats; this.opts = opts;
    this.el = this.$('console'); this.last = 0; this.histA = null; this.histN = -1; this.tableA = null; this.tableN = -1;
    this.doc = doc;
    this.tabs = [...this.el.querySelectorAll('.tabs button')];
    this.tabs.forEach(b => b.addEventListener('click', () => this.showTab(b.dataset.for)));
  }
  showTab(name) {
    this.tabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.for === name)));
    this.el.querySelectorAll('section[data-tab]').forEach(sec => sec.classList.toggle('active', sec.dataset.tab === name));
    this.last = 0;
  }
  visible(id) { const el = this.$(id); return el && el.offsetParent !== null; }
  histFor(a) {
    if (this.histA === a && this.histN === a.S.length) return this.hist;
    const isLive = !!a.feed, lo = isLive && a.S.length ? Math.min(...a.S, -30) : -30, span = Math.max(24, (a.S.length ? Math.max(...a.S, -6) : -6) - lo);
    this.histLo = lo; this.histSpan = span; this.hist = new Array(24).fill(0);
    for (const v of a.S) if (v > -39 || a.feed) this.hist[clamp(Math.floor((v - lo) / span * 24), 0, 23)]++;
    this.histA = a; this.histN = a.S.length; return this.hist;
  }
  get hidden() { return this.el.hidden; }
  toggle(show) { this.el.hidden = show === undefined ? !this.el.hidden : !show; if (!this.el.hidden) this.last = 0; }
  chart(id) {
    const c = this.$(id), r = c.getBoundingClientRect(), dpr = Math.min(2, this.doc.defaultView.devicePixelRatio || 1);
    if (c.width !== Math.round(r.width * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, r.width, r.height); x.font = '11px ' + getComputedStyle(this.doc.body).fontFamily;
    return [x, r.width, r.height];
  }
  render(state) {
    const { t, sky, wx, playing, live, disp, spec, events, W, H, Q, fpsCap, track, dur, scene } = state, a = this.getA(), st = a.at(a.S, t), mo = a.at(a.M, t), pk = a.at(a.PK, t), $ = this.$, isLive = !!a.feed;
    $('stateLine').textContent = `${scene ? 'Scène ' + scene + ' — ' : ''}${track ? track + ' — ' : ''}${playing ? 'Lecture' : 'Pause'} à ${tc(t)} sur ${tc(dur)}. ${isLive ? 'Paysage construit en direct à l’écoute.' : ''}${live ? 'Analyse du son en direct.' : 'Analyse précalculée, le son n’est pas accessible à la page : sers-la en HTTP ou charge le fichier avec o.'}`;
    const cyc = sky.u < .5 ? `jour, ${Math.round(sky.u * 200)} %` : `nuit, ${Math.round((sky.u - .5) * 200)} %`;
    const items = [[tc(t), 'position'], [`${fr(st)} LUFS`, 'court terme'], [`${fr(mo)} LUFS`, 'momentané'], [`${fr(pk)} dBFS`, 'crête'],
      [String(this.stats.kicks), 'coups de sub détectés'], [`${Math.round(this.stats.fps)} i/s`, `cadence, plafond ${fpsCap}`], [`${W} × ${H}`, `rendu, qualité ${Math.round(Q * 100)} %`], [`${fr(this.stats.work, 1)} ms`, 'calcul par image'],
      [WNAME[wx.w], `météo, intensité ${Math.round(wx.k * 100)} %`], [cyc, 'cycle du ciel'], [sky.sun.up ? 'soleil' : sky.moon.up ? 'lune' : 'aucun', 'astre levé'], [String(events.length), 'passages à l’écran'],
      [`${Math.round(disp.sub * 100)} %`, 'sub'], [`${Math.round(disp.bass * 100)} %`, 'basses'], [`${Math.round(disp.mid * 100)} %`, 'médiums'], [`${Math.round(disp.high * 100)} %`, 'aigus']];
    $('stats').innerHTML = items.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
    if (this.visible('chSpec')) { const [x, w, h] = this.chart('chSpec'), n = spec.length, bw = w / n; for (let i = 0; i < n; i++) { x.fillStyle = i < n / 6 ? C.sub : i < n * .42 ? C.bass : i < n * .75 ? C.mid : C.high; x.globalAlpha = .85; const bh = Math.max(2, spec[i] * (h - 18)); x.beginPath(); x.roundRect(i * bw + 1, h - 16 - bh, bw - 2, bh, [3, 3, 0, 0]); x.fill(); } x.globalAlpha = 1; x.fillStyle = C.ink2; ['40 Hz', '200 Hz', '1 kHz', '5 kHz', '12 kHz'].forEach((l, i) => { x.textAlign = i === 0 ? 'left' : i === 4 ? 'right' : 'center'; x.fillText(l, i / 4 * w, h - 3); }); }
    if (this.visible('chBands')) { const [x, w, h] = this.chart('chBands'), hist = this.stats.bandHist, n = hist.length; x.strokeStyle = C.line; x.beginPath(); for (let k = 0; k <= 2; k++) { x.moveTo(0, 6 + k * (h - 24) / 2); x.lineTo(w, 6 + k * (h - 24) / 2); } x.stroke();
      [C.sub, C.bass, C.mid, C.high].forEach((col, j) => { x.strokeStyle = col; x.lineWidth = 2; x.lineJoin = 'round'; x.beginPath(); for (let i = 0; i < n; i++) { const px = (i / 239) * w, py = 6 + (1 - hist[i][j]) * (h - 24); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); });
      x.fillStyle = C.ink2; x.textAlign = 'left'; x.fillText('il y a 60 s', 0, h - 3); x.textAlign = 'right'; x.fillText('maintenant', w, h - 3); }
    if (this.visible('chSet')) { const [x, w, h] = this.chart('chSet'), top = 4, plotH = h - 44, DUR = Math.max(1, isLive ? dur : a.duration), lo = isLive ? Math.min(...a.S, -30) : -30, span = isLive ? Math.max(24, Math.max(...a.S, -6) - lo) : 24, xs = tt => tt / DUR * w, ys = v => top + (1 - clamp((v - lo) / span, 0, 1)) * plotH, N = Math.floor(w);
      x.strokeStyle = C.line; x.beginPath(); for (let v = -30; v <= -6; v += 8) { x.moveTo(0, ys(v)); x.lineTo(w, ys(v)); } x.stroke();
      const known = isLive ? a.duration : DUR, NK = Math.max(1, Math.floor(N * known / DUR));
      x.beginPath(); x.moveTo(0, ys(lo)); for (let i = 0; i <= NK; i++) x.lineTo(i, ys(a.at(a.S, i / N * DUR))); x.lineTo(NK, ys(lo)); x.closePath(); x.fillStyle = C.series; x.globalAlpha = .18; x.fill(); x.globalAlpha = 1;
      x.strokeStyle = C.series; x.lineWidth = 1.5; x.beginPath(); for (let i = 0; i <= NK; i++) { const py = ys(a.at(a.S, i / N * DUR)); i ? x.lineTo(i, py) : x.moveTo(i, py); } x.stroke();
      if (!isLive) { x.strokeStyle = C.ink2; x.setLineDash([3, 3]); x.beginPath(); x.moveTo(0, ys(a.meta.I)); x.lineTo(w, ys(a.meta.I)); x.stroke(); x.setLineDash([]); x.fillStyle = C.ink2; x.textAlign = 'left'; x.fillText(`intégré ${fr(a.meta.I)} LUFS`, 4, ys(a.meta.I) - 4); }
      for (let sg = 0; sg * WSEG < DUR; sg++) { x.fillStyle = WCOL[pickW(sg)]; x.fillRect(xs(sg * WSEG), top + plotH + 6, xs(Math.min(DUR, (sg + 1) * WSEG)) - xs(sg * WSEG) - 1, 8); }
      for (let i = 0; i < N; i += 2) { const sk = skyState(i / N * DUR); x.fillStyle = `hsl(215,50%,${lerp(8, 60, sk.day)}%)`; x.fillRect(i, top + plotH + 18, 2, 8); }
      x.fillStyle = C.ink; x.fillRect(xs(t) - .5, top, 1.5, plotH + 26);
      x.fillStyle = C.ink2; x.textAlign = 'left'; x.fillText('0', 0, h - 3); x.textAlign = 'right'; x.fillText(`${Math.round(DUR / 60)} min`, w, h - 3); x.textAlign = 'center'; for (let m = 10; m < DUR / 60 - 6; m += 10) x.fillText(`${m}`, xs(m * 60), h - 3);
      x.textAlign = 'left'; x.strokeStyle = 'rgba(10,12,22,.85)'; x.lineWidth = 3; x.lineJoin = 'round'; for (const [lab, yy] of [['météo', top + plotH + 13], ['jour et nuit', top + plotH + 25]]) { x.strokeText(lab, 3, yy); x.fillText(lab, 3, yy); } }
    if (this.visible('chHist')) { const hist = this.histFor(a), [x, w, h] = this.chart('chHist'), mx = Math.max(1, ...hist), bw = w / hist.length, cur = clamp(Math.floor((st - this.histLo) / this.histSpan * 24), 0, 23);
      hist.forEach((v, i) => { x.fillStyle = i === cur ? C.ink : C.series; x.globalAlpha = i === cur ? 1 : .8; const bh = v / mx * (h - 20); x.beginPath(); x.roundRect(i * bw + 1, h - 16 - bh, bw - 2, bh, [3, 3, 0, 0]); x.fill(); });
      x.globalAlpha = 1; x.fillStyle = C.ink2; x.textAlign = 'left'; x.fillText(isLive ? 'plus bas' : '−30 LUFS', 0, h - 3); x.textAlign = 'right'; x.fillText(isLive ? 'plus fort' : '−6 LUFS', w, h - 3); x.textAlign = 'center'; x.fillText('la barre claire est la loudness actuelle', w / 2, h - 3); }
    if (this.visible('chFps')) { const [x, w, h] = this.chart('chFps'), fh = this.stats.fpsHist, n = fh.length, yc = 6 + (1 - fpsCap / 40) * (h - 24); x.strokeStyle = C.line; x.beginPath(); x.moveTo(0, yc); x.lineTo(w, yc); x.stroke();
      x.strokeStyle = C.series; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < n; i++) { const px = i / 59 * w, py = 6 + (1 - clamp(fh[i], 0, 40) / 40) * (h - 24); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
      x.fillStyle = C.ink2; x.textAlign = 'left'; x.fillText(`plafond ${fpsCap} i/s`, 4, yc - 4); x.fillText('il y a 2 min', 0, h - 3); x.textAlign = 'right'; x.fillText('maintenant', w, h - 3); }
    if (this.visible('chEvents')) { const [x, w, h] = this.chart('chEvents'), keys = Object.keys(TYPES), rowH = h / keys.length, sp = this.stats.spawned, mx = Math.max(1, ...keys.map(k => sp[k] || 0)), on = {}; for (const e of events) on[e.type] = (on[e.type] || 0) + 1;
      keys.forEach((k, i) => { const v = sp[k] || 0, y = i * rowH, bw = Math.max(2, v / mx * (w - 150)); x.fillStyle = C.ink2; x.textAlign = 'left'; x.fillText(TYPES[k].label, 0, y + rowH * .72); x.fillStyle = C.series; x.globalAlpha = .8; x.beginPath(); x.roundRect(110, y + rowH * .2, bw, rowH * .6, 3); x.fill(); x.globalAlpha = 1; x.fillStyle = C.ink; x.fillText(v + (on[k] ? ` · ${on[k]} à l’écran` : ''), 116 + bw, y + rowH * .72); }); }
    if (this.visible('segments') && (this.tableA !== a || (isLive && a.S.length - this.tableN > 40))) {
      this.tableA = a; this.tableN = a.S.length;
      let html = '<tr><th>Tranche</th><th>Court terme moyen</th><th>Momentané max</th><th>Crête</th><th>Météo</th></tr>';
      for (let s0 = 0; s0 < Math.max(a.duration, 1); s0 += 600) { const idx = []; for (let i = 0; i < a.S.length; i++) if (i * a.step >= s0 && i * a.step < s0 + 600 && (a.S[i] > -39 || isLive)) idx.push(i); if (!idx.length) continue; const mean = idx.reduce((q, i) => q + a.S[i], 0) / idx.length, mxm = Math.max(...idx.map(i => a.M[i])), pkm = Math.max(...idx.map(i => a.PK[i])); const ws = [...new Set([0, 1, 2, 3].map(j => WNAME[pickW(Math.floor((s0 + j * 150) / WSEG))]))].join(', '); html += `<tr><td>${mmss(s0)} à ${mmss(Math.min(a.duration, s0 + 600))}</td><td>${fr(mean)} LUFS</td><td>${fr(mxm)} LUFS</td><td>${fr(pkm)} dBFS</td><td>${ws}</td></tr>`; }
      $('segments').innerHTML = html;
    }
  }
}
