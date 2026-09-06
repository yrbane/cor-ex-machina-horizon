import { clamp, pct, smooth } from '../util.js';
import { hsl } from '../palette.js';

// Plans du paysage : la loudness du set à quatre échelles de temps, du lointain (30 min par écran) au proche (45 s)
export function makeLayers(S, step) {
  const layers = [
    { win: 1800, data: smooth(S, Math.round(60 / step)), h: .34, band: 'bass', l: 16, a: .9, fog: .55 },
    { win: 600, data: smooth(S, Math.round(15 / step)), h: .30, band: 'bass', l: 22, a: .95, fog: .35 },
    { win: 180, data: smooth(S, Math.round(3 / step)), h: .24, band: 'mid', l: 24, a: 1, fog: .18 },
    { win: 45, data: S, h: .18, band: 'sub', l: 26, a: 1, fog: 0 },
  ];
  for (const L of layers) {
    const v = [...L.data].filter(x => x > -39);
    L.lo = v.length ? pct(v, .04) : -39; L.hi = v.length ? pct(v, .985) : -6;
    if (L.hi - L.lo < 1) L.hi = L.lo + 1;
    L.step = step; L.duration = L.data.length * step;
  }
  return layers;
}

// Hauteur relative d'un plan à l'instant tt : 0 dans le silence (rien à dessiner), sinon 0,1…1 selon la loudness
export function layerValue(L, tt, step = L.step) {
  if (tt < 0 || tt > L.duration) return 0;
  const i = clamp(tt / step, 0, L.data.length - 1), i0 = Math.floor(i), i1 = Math.min(L.data.length - 1, i0 + 1), f = i - i0;
  const d = L.data[i0] + (L.data[i1] - L.data[i0]) * f;
  if (d <= -39) return 0;
  return .1 + .9 * clamp((d - L.lo) / (L.hi - L.lo), 0, 1);
}

// Silhouette d'un plan centrée sur l'instant présent, avec brume et lumière du jour ; rien n'est tracé si tout est plat
export function drawLayer(ctx, L, t, scene, sky, i) {
  const { W, H, horizon, parX = 0, disp, hue = 0 } = scene, depth = i / 3;
  const y0 = horizon + H * .02 * i, px = W / 2 - parX * W * (.01 + depth * .05);
  const t0 = t - L.win / 2, amp = H * L.h * (.85 + (disp ? disp[L.band] : .5) * .15), step = 3;
  let maxV = 0;
  ctx.beginPath(); ctx.moveTo(0, y0);
  for (let x = 0; x <= W; x += step) { const v = layerValue(L, t0 + (x - px) / W * L.win); if (v > maxV) maxV = v; ctx.lineTo(x, y0 - v * amp); }
  ctx.lineTo(W, y0); ctx.closePath();
  if (maxV <= 0) return;
  const dl = sky.day * (14 + L.fog * 22), ds = sky.day * 20, warm = sky.dusk * 10;
  const g = ctx.createLinearGradient(0, y0 - amp, 0, y0);
  g.addColorStop(0, hsl(hue, L.band, 55 - L.fog * 30 - ds, L.l + 10 + L.fog * 20 + dl + warm, L.a));
  g.addColorStop(1, hsl(hue, L.band, 60 - L.fog * 30 - ds, L.l - 6 + L.fog * 14 + dl * .7, L.a));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = hsl(hue, L.band, 80, 55 + L.fog * 20 + dl, (.35 - L.fog * .25) * clamp(maxV * 3, 0, 1)); ctx.lineWidth = 1.2; ctx.stroke();
}

// Temps visé par un point de l'écran : le plan touché donne l'échelle, sinon le lointain
export function timeAt(layers, xs, ys, t, scene) {
  const { W, H, horizon, parX = 0, disp } = scene;
  for (let i = layers.length - 1; i >= 0; i--) {
    const L = layers[i], depth = i / 3, y0 = horizon + H * .02 * i, px = W / 2 - parX * W * (.01 + depth * .05), amp = H * L.h * (.85 + (disp ? disp[L.band] : .5) * .15);
    const tt = t + (xs - px) / W * L.win, v = layerValue(L, tt);
    if (ys >= y0 - v * amp && ys <= y0) return tt;
  }
  return t + (xs - W / 2) / W * layers[0].win;
}
