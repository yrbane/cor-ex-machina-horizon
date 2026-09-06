import { clamp, lerp, hash, TAU } from '../util.js';
import { SEA_TYPES } from '../events.js';
import { makeBiomeCycle, mix } from './biome.js';

// Scène « Océan » : au fond des océans. Les plans de loudness deviennent des reliefs sous-marins, la lumière tombe
// de la surface, la neige marine dérive, les bulles montent. Biomes : récif, forêt de kelp, abysses.
export const SEA_BIOMES = ['reef', 'kelp', 'abyss'];
const seaCycle = makeBiomeCycle(SEA_BIOMES, 300, 73);
export const seaBiomeAt = t => seaCycle.at(t);
export const seaGeometry = H => ({ surface: H * .04, floor: H * .9 });
const seaCol = (c, dl = 0, a = 1) => `hsla(${c.h},${c.s}%,${clamp(c.l + dl, 0, 100)}%,${a})`;
const SEA_PAL = {
  reef:  { water: { top: { h: 190, s: 70, l: 55 }, bottom: { h: 205, s: 70, l: 22 } }, layers: [{ h: 200, s: 40, l: 30 }, { h: 335, s: 28, l: 36 }, { h: 22, s: 38, l: 40 }, { h: 290, s: 24, l: 32 }], floor: { h: 40, s: 30, l: 52 }, flora: 'coral', glow: 0, light: 1 },
  kelp:  { water: { top: { h: 165, s: 45, l: 42 }, bottom: { h: 180, s: 55, l: 14 } }, layers: [{ h: 175, s: 35, l: 26 }, { h: 165, s: 40, l: 22 }, { h: 150, s: 40, l: 20 }, { h: 140, s: 40, l: 16 }], floor: { h: 90, s: 25, l: 24 }, flora: 'kelp', glow: 0, light: .7 },
  abyss: { water: { top: { h: 220, s: 60, l: 12 }, bottom: { h: 230, s: 70, l: 3 } }, layers: [{ h: 225, s: 30, l: 10 }, { h: 228, s: 30, l: 8 }, { h: 232, s: 30, l: 6 }, { h: 235, s: 30, l: 4 }], floor: { h: 230, s: 25, l: 8 }, flora: 'vent', glow: 1, light: .15 },
};
export function seaPalette({ b, prev, k }) {
  const A = SEA_PAL[prev] || SEA_PAL[b], B = SEA_PAL[b];
  return { water: { top: mix(A.water.top, B.water.top, k), bottom: mix(A.water.bottom, B.water.bottom, k) }, layers: B.layers.map((c, i) => mix(A.layers[i], c, k)), floor: mix(A.floor, B.floor, k), flora: k < .5 ? A.flora : B.flora, glow: lerp(A.glow, B.glow, k), light: lerp(A.light, B.light, k), b, k };
}

function drawWaterBackdrop(ctx, S, pal, day) {
  const { W, H, tn, wx } = S, g = ctx.createLinearGradient(0, 0, 0, H);
  const dim = -(1 - day) * 14 - wx.dark * 10;
  g.addColorStop(0, seaCol(pal.water.top, dim)); g.addColorStop(1, seaCol(pal.water.bottom, dim)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Rayons de lumière depuis la surface, qui ondulent lentement
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const x = W * (.05 + i * .14) + Math.sin(tn * .3 + i) * W * .03, wdt = W * (.03 + hash(i + .3) * .04), sway = Math.sin(tn * .2 + i * 1.7) * W * .08;
    const a = (.06 + .05 * Math.sin(tn * .5 + i * 2)) * pal.light * (.3 + .7 * day);
    const rg = ctx.createLinearGradient(0, 0, 0, H * .8); rg.addColorStop(0, `rgba(220,245,255,${a})`); rg.addColorStop(1, 'rgba(220,245,255,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x - wdt, 0); ctx.lineTo(x + wdt, 0); ctx.lineTo(x + wdt * 3 + sway, H * .85); ctx.lineTo(x - wdt * 3 + sway, H * .85); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Neige marine et bulles : positions déduites du temps du morceau, cohérentes après un saut
function drawParticles(ctx, S, pal) {
  const { W, H, t, tn, wx } = S, drift = wx.w === 'storm' ? 2.5 : 1;
  ctx.fillStyle = 'rgba(230,240,255,.35)';
  for (let i = 0; i < 70; i++) { const sp = .3 + hash(i + 11) * .5, y = ((t * sp * .02 * drift + hash(i)) % 1) * H, x = ((hash(i + 99) + Math.sin(t * .3 + i) * .01 * drift) % 1 + 1) % 1 * W; ctx.fillRect(x, y, 1.5, 1.5); }
  for (let i = 0; i < 24; i++) { const sp = .5 + hash(i + 31) * .8, ph = (t * sp * .08 + hash(i + 3)) % 1, x = ((hash(i + 57) + Math.sin(tn * 2 + i) * .006) % 1 + 1) % 1 * W, y = H * (1.02 - ph * 1.05), r = 1.5 + hash(i + 5) * 3 * ph; ctx.strokeStyle = 'rgba(220,240,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
  if (pal.glow > 0) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 40; i++) { const a = pal.glow * (.3 + .7 * Math.pow(Math.max(0, Math.sin(tn * (1 + hash(i) * 2) + i)), 3)); const x = hash(i + 77) * W, y = H * (.3 + hash(i + 88) * .65); ctx.fillStyle = `hsla(${180 + hash(i + 2) * 80},90%,70%,${a * .8})`; ctx.beginPath(); ctx.arc(x, y, 1.5 + hash(i + 4) * 2, 0, TAU); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; }   // bioluminescence
}

// Flore du premier plan, le long de l'axe du temps du plan proche
function drawFlora(ctx, S, pal, floor) {
  const { W, H, t, tn } = S, win = 45, t0 = t - win / 2, spacing = 2.2;
  for (let k = Math.floor(t0 / spacing); k <= Math.ceil((t0 + win) / spacing); k++) {
    const tt = k * spacing + hash(k * 1.3) * spacing * .8, x = (tt - t0) / win * W; if (x < -W * .05 || x > W * 1.05) continue;
    const size = H * (.04 + hash(k + .5) * .06), y = floor + H * .005 + hash(k + .9) * H * .03, sway = Math.sin(tn * .8 + k) * .12;
    if (pal.flora === 'kelp') { ctx.strokeStyle = `hsla(${95 + hash(k) * 30},45%,${28 + hash(k + .2) * 12}%,.9)`; ctx.lineWidth = Math.max(2, size * .08); ctx.beginPath(); ctx.moveTo(x, y); for (let s = 1; s <= 6; s++) ctx.lineTo(x + Math.sin(tn * .9 + k + s * .8) * size * .18 * s, y - size * .45 * s); ctx.stroke(); for (let s = 1; s <= 5; s++) { ctx.fillStyle = `hsla(${95 + hash(k) * 30},45%,${30 + s * 2}%,.8)`; ctx.beginPath(); ctx.ellipse(x + Math.sin(tn * .9 + k + s * .8) * size * .18 * s + size * .1, y - size * .45 * s, size * .16, size * .06, .5 + sway, 0, TAU); ctx.fill(); } }
    else if (pal.flora === 'coral') { const hh = [340, 20, 300, 170, 45][k % 5 < 0 ? 0 : Math.abs(k) % 5]; ctx.strokeStyle = `hsla(${hh},65%,55%,.95)`; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, size * .12); for (let br = -2; br <= 2; br++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + br * size * .25 + sway * size, y - size * .5, x + br * size * .4 + sway * size, y - size * (.7 + hash(k + br) * .4)); ctx.stroke(); } ctx.fillStyle = `hsla(${(hh + 40) % 360},70%,60%,.9)`; ctx.beginPath(); ctx.ellipse(x + size * .6, y - size * .1, size * .35, size * .2, 0, Math.PI, 0); ctx.fill(); }
    else { ctx.fillStyle = 'rgba(20,24,40,.95)'; ctx.beginPath(); ctx.moveTo(x - size * .3, y); ctx.lineTo(x - size * .1, y - size * .9); ctx.lineTo(x + size * .1, y - size * .9); ctx.lineTo(x + size * .3, y); ctx.fill(); if (hash(k + .4) > .5) { ctx.globalCompositeOperation = 'lighter'; for (let s = 0; s < 4; s++) { const a = .3 + .3 * Math.sin(tn * 3 + s + k); ctx.fillStyle = `rgba(120,200,255,${a * .5})`; ctx.beginPath(); ctx.arc(x + Math.sin(tn + s) * size * .1, y - size * (1 + s * .25), size * (.12 - s * .02), 0, TAU); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; } }   // cheminée hydrothermale
  }
}

export function renderSea(ctx, S, D) {
  const { W, H, t, sky, wx, disp, layers, events } = S, g = seaGeometry(H), floor = g.floor, pal = seaPalette(seaBiomeAt(t)), day = .35 + .65 * sky.day;
  drawWaterBackdrop(ctx, S, pal, day);
  // Reliefs sous-marins : du lointain sombre au proche, un peu plus clairs vers le haut là où la lumière arrive
  const geom = i => ({ y0: H * (.62 + i * .095), amp: H * layers[i].h * 1.2 * (.85 + disp[layers[i].band] * .15) });
  layers.forEach((L, i) => { const { y0, amp } = geom(i), c = pal.layers[Math.min(i, 3)]; D.drawLayer(ctx, L, t, { ...S, horizon: y0, wTop: floor }, { day, dusk: 0 }, i, { y0, amp, colors: { h: c.h, s: c.s, l: c.l + 6 * day } }); });
  ctx.fillStyle = seaCol(pal.floor, -(1 - day) * 12); ctx.fillRect(0, floor, W, H - floor);
  ctx.fillStyle = seaCol(pal.floor, 6, .5); for (let i = 0; i < 4; i++) { const y = floor + H * (.02 + i * .022); ctx.beginPath(); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y + Math.sin(x * .02 + t * .6 + i) * H * .004); ctx.lineTo(W, y + H * .012); ctx.lineTo(0, y + H * .012); ctx.closePath(); ctx.fill(); }
  drawFlora(ctx, S, pal, floor);
  for (const e of events) if (SEA_TYPES.includes(e.type)) D.drawEvent(ctx, e, { ...S, horizon: H, wTop: floor, biome: pal.b }, sky);
  drawParticles(ctx, S, pal);
  return { src: null, srcVis: 0, horizon: H * .5, wTop: floor - H * .025, layerGeom: geom };
}
