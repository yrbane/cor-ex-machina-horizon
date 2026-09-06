import { hash, TAU } from '../util.js';
import { hsl } from '../palette.js';

// Phénomènes météo. Toutes les positions dérivent du temps du morceau : un saut dans le set reste cohérent.
export function drawRain(ctx, t, k, wind, stormy, W, H) {
  ctx.strokeStyle = `rgba(200,215,240,${.28 * k})`; ctx.lineWidth = 1; ctx.beginPath();
  const n = stormy ? 160 : 110, slant = wind * 1500;
  for (let i = 0; i < n; i++) {
    const sp = 1 + hash(i + 500) * .8, ph = (t * sp * 1.4 + hash(i)) % 1;
    const x = ((hash(i + 1000) - ph * slant * .01 + 2) % 1) * W, y = ph * H * 1.05 - H * .05, len = H * (.025 + sp * .01);
    ctx.moveTo(x, y); ctx.lineTo(x - slant * len * .01, y + len);
  }
  ctx.stroke();
}
export function drawSnow(ctx, t, k, W, H) {
  ctx.fillStyle = `rgba(240,244,255,${.75 * k})`;
  for (let i = 0; i < 90; i++) {
    const sp = .5 + hash(i + 700) * .7, ph = (t * sp * .06 + hash(i + 300)) % 1;
    const x = ((hash(i + 900) + Math.sin(t * .6 + i) * .015 + 1) % 1) * W, y = ph * H * 1.05 - H * .03, r = .8 + hash(i + 42) * 1.8;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
}
export function drawFog(ctx, k, horizon, W, H) {
  const g = ctx.createLinearGradient(0, horizon - H * .34, 0, horizon + H * .06);
  g.addColorStop(0, 'rgba(190,200,225,0)'); g.addColorStop(.5, `rgba(190,200,225,${.45 * k})`); g.addColorStop(1, `rgba(190,200,225,${.25 * k})`);
  ctx.fillStyle = g; ctx.fillRect(0, horizon - H * .34, W, H * .4);
}
export function drawAurora(ctx, tn, k, horizon, W, hue, mid) {
  ctx.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 3; j++) {
    const band = ['bass', 'high', 'mid'][j], base = horizon * (.12 + j * .08), amp = horizon * .06, thick = horizon * (.22 - j * .04);
    const g = ctx.createLinearGradient(0, base - amp, 0, base + thick);
    g.addColorStop(0, hsl(hue, band, 80, 60, (.18 + mid * .2) * k)); g.addColorStop(1, hsl(hue, band, 80, 60, 0));
    ctx.fillStyle = g; ctx.beginPath();
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, base + Math.sin(x * .006 + tn * .4 + j * 2) * amp + Math.sin(x * .017 - tn * .7) * amp * .4);
    for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, base + thick + Math.sin(x * .006 + tn * .4 + j * 2) * amp);
    ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}
export function drawRainbow(ctx, a, sunX, horizon, W, H) {
  const cx = W - sunX, r0 = H * .62, cols = ['#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#32ade6', '#5856d6', '#af52de'];
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, horizon); ctx.clip(); ctx.lineWidth = H * .011;
  cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.globalAlpha = .26 * a; ctx.beginPath(); ctx.arc(cx, horizon, r0 - i * H * .011, Math.PI, 0); ctx.stroke(); });
  ctx.globalAlpha = 1; ctx.restore();
}

// Foudre : un éclair est une polyligne tirée du haut du ciel jusqu'aux montagnes, affichée un quart de seconde
export class Lightning {
  constructor() { this.t = -9; this.pts = []; }
  strike(W, horizon, rng, tn) { let x = (.15 + rng() * .7) * W, y = horizon * .12; this.pts = [[x, y]]; while (y < horizon * .95) { y += horizon * (.05 + rng() * .07); x += (rng() - .5) * W * .05; this.pts.push([x, y]); } this.t = tn; }
  draw(ctx, tn, W, H) {
    const age = tn - this.t; if (age > .25 || this.pts.length < 2) return;
    const a = 1 - age / .25;
    ctx.fillStyle = `rgba(230,235,255,${.35 * a})`; ctx.fillRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.beginPath(); this.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.strokeStyle = `rgba(180,200,255,${a * .4})`; ctx.lineWidth = Math.max(4, H * .01); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = Math.max(1.5, H * .003); ctx.stroke();
  }
}
