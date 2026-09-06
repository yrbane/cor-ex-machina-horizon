import { clamp, lerp, hash, TAU } from '../util.js';
import { WATER_TYPES, BEHIND_CLOUDS } from '../events.js';
import { biomeAt, biomePalette } from './biome.js';
import { layerValue } from '../draw/landscape.js';

// Scène « Vallée » : montagnes hautes, fond de vallée, végétation au premier plan, biomes qui alternent. Pas d'eau.
export const valleyGeometry = H => ({ horizon: H * .58, floor: H * .84 });
const bcol = (c, dl = 0, a = 1) => `hsla(${c.h},${c.s}%,${clamp(c.l + dl, 0, 100)}%,${a})`;

// Végétation au premier plan : silhouettes posées le long de l'axe du temps du plan proche, elles défilent avec lui
function drawVegetation(ctx, S, pal, floor) {
  const { W, H, t } = S, win = 45, t0 = t - win / 2, spacing = 2.6;
  const first = Math.floor(t0 / spacing), last = Math.ceil((t0 + win) / spacing);
  for (let k = first; k <= last; k++) {
    const jitter = hash(k * 1.7) * spacing * .8, tt = k * spacing + jitter, x = (tt - t0) / win * W;
    if (x < -W * .05 || x > W * 1.05) continue;
    const size = H * (.035 + hash(k + .5) * .035), y = floor + H * .01 + hash(k + .9) * H * .04, kind = pal.veg, dark = bcol(pal.floor, -22);
    if (kind === 'pine' || kind === 'fir') {
      const green = kind === 'fir' ? { h: 160, s: 25, l: 28 } : { h: 125, s: 40, l: 24 };
      ctx.fillStyle = bcol(green, -(y - floor) / H * 60);
      for (let s = 0; s < 3; s++) { const w = size * (.9 - s * .22), yy = y - size * s * .45; ctx.beginPath(); ctx.moveTo(x, yy - size * .8); ctx.lineTo(x + w * .5, yy); ctx.lineTo(x - w * .5, yy); ctx.closePath(); ctx.fill(); }
      if (kind === 'fir') { ctx.fillStyle = 'rgba(245,248,255,.85)'; for (let s = 0; s < 3; s++) { const w = size * (.9 - s * .22), yy = y - size * s * .45; ctx.beginPath(); ctx.moveTo(x, yy - size * .8); ctx.lineTo(x + w * .3, yy - size * .32); ctx.lineTo(x - w * .3, yy - size * .32); ctx.closePath(); ctx.fill(); } }
      ctx.fillStyle = dark; ctx.fillRect(x - size * .06, y, size * .12, size * .22);
    } else {
      ctx.lineCap = 'round';
      ctx.strokeStyle = bcol({ h: 118, s: 32, l: 34 }); ctx.lineWidth = size * .22;
      ctx.beginPath(); ctx.moveTo(x, y + size * .1); ctx.lineTo(x, y - size); ctx.stroke();                                       // tronc
      if (hash(k + .3) > .3) { ctx.beginPath(); ctx.moveTo(x - size * .1, y - size * .45); ctx.lineTo(x - size * .38, y - size * .45); ctx.lineTo(x - size * .38, y - size * .8); ctx.stroke(); }
      if (hash(k + .6) > .3) { ctx.beginPath(); ctx.moveTo(x + size * .1, y - size * .6); ctx.lineTo(x + size * .36, y - size * .6); ctx.lineTo(x + size * .36, y - size * .9); ctx.stroke(); }
      if (hash(k + .8) > .6) { ctx.fillStyle = bcol(pal.floor, -25); ctx.beginPath(); ctx.ellipse(x + size * .7, y + size * .05, size * .35, size * .14, 0, 0, TAU); ctx.fill(); }   // rocher
    }
  }
}

// Fond de vallée : sol du biome avec bandes de relief, et une piste qui serpente au rythme du plan proche
function drawFloor(ctx, S, pal, floor) {
  const { W, H, t } = S;
  ctx.fillStyle = bcol(pal.floor); ctx.fillRect(0, floor, W, H - floor);
  ctx.fillStyle = bcol(pal.floor, -6, .9); ctx.fillRect(0, floor, W, H * .012);
  for (let i = 0; i < 5; i++) { ctx.fillStyle = bcol(pal.floor, -4 - i * 3, .35); const y = floor + H * (.03 + i * .035); ctx.beginPath(); for (let x = 0; x <= W; x += 6) { const tt = t - 22 + x / W * 45; ctx.lineTo(x, y + Math.sin(tt * .9 + i) * H * .006); } ctx.lineTo(W, y + H * .02); ctx.lineTo(0, y + H * .02); ctx.closePath(); ctx.fill(); }
  if (pal.snowline > 0) { ctx.fillStyle = `rgba(255,255,255,${.35 * pal.snowline})`; for (let i = 0; i < 40; i++) { const x = ((hash(i + 3) + (t * .002)) % 1) * W, y = floor + hash(i + 7) * (H - floor); ctx.beginPath(); ctx.ellipse(x, y, H * .012, H * .004, 0, 0, TAU); ctx.fill(); } }
}

// Neige sur les crêtes des plans, dans le biome enneigé et en transition
function drawSnowCaps(ctx, S, L, i, y0, amp, snowline) {
  if (snowline <= 0) return;
  const { W, t } = S, t0 = t - L.win / 2, px = W / 2 - S.parX * W * (.01 + i / 3 * .05);
  ctx.fillStyle = `rgba(250,252,255,${.85 * snowline})`; ctx.beginPath(); let started = false;
  for (let x = 0; x <= W; x += 3) { const v = layerValue(L, t0 + (x - px) / W * L.win); const yy = y0 - v * amp; if (!started) { ctx.moveTo(x, yy); started = true; } else ctx.lineTo(x, yy); }
  for (let x = W; x >= 0; x -= 3) { const v = layerValue(L, t0 + (x - px) / W * L.win); ctx.lineTo(x, y0 - Math.max(0, v - .18 * snowline) * amp); }
  ctx.closePath(); ctx.fill();
}

export function renderValley(ctx, S, D) {
  const { W, H, t, sky, wx, disp, layers, events } = S, g = valleyGeometry(H), horizon = g.horizon, floor = g.floor;
  const pal = biomePalette(biomeAt(t));
  // Ciel du biome : la teinte du haut et du bas remplace celle de l'horizon, le jour ; la nuit garde le ciel commun
  D.drawSky(ctx, S, horizon, { top: bcol(pal.sky.top), bottom: bcol(pal.sky.bottom), floorTo: floor });
  const { src, srcVis } = D.drawBodies(ctx, S, horizon);
  D.drawStreaks(ctx, S, horizon);
  for (const e of events) if (BEHIND_CLOUDS.includes(e.type)) D.drawEvent(ctx, e, { ...S, horizon, wTop: floor }, sky);
  D.drawClouds(ctx, S, horizon);
  if (wx.rainbow > 0 && sky.day > .3 && src && src.kind === 'sun') D.drawRainbow(ctx, wx.rainbow * sky.day, src.x, horizon, W, H);
  for (const e of events) if (!WATER_TYPES.includes(e.type) && !BEHIND_CLOUDS.includes(e.type)) D.drawEvent(ctx, e, { ...S, horizon, wTop: floor }, sky);
  // Brume lointaine : entre le ciel et le pied des premiers plans, pour ne pas laisser une bande plate qui ressemble à un lac
  const geom = i => ({ y0: horizon + (floor - horizon) * (.25 + i * .25), amp: H * layers[i].h * 1.35 * (.85 + disp[layers[i].band] * .15) });
  { const far = pal.layers[0], night = 1 - sky.day, hz = ctx.createLinearGradient(0, horizon - H * .02, 0, geom(0).y0 + 1);
    hz.addColorStop(0, bcol(pal.sky.bottom, -night * 40, 0)); hz.addColorStop(1, bcol(far, 14 - night * 26, .95)); ctx.fillStyle = hz; ctx.fillRect(0, horizon - H * .02, W, geom(0).y0 - horizon + H * .03); }
  // Plans : plus hauts que sur l'horizon, colorés par le biome, neige sur les crêtes
  layers.forEach((L, i) => {
    const c = pal.layers[Math.min(i, pal.layers.length - 1)], { y0, amp } = geom(i);
    D.drawLayer(ctx, L, t, { ...S, horizon, wTop: floor }, sky, i, { y0, amp, colors: c });
    drawSnowCaps(ctx, S, L, i, y0, amp, pal.snowline * (.4 + i * .2));
    if (i === 1 && wx.w === 'fog') D.drawFog(ctx, wx.k, floor, W, H);
  });
  drawFloor(ctx, S, pal, floor);
  drawVegetation(ctx, S, pal, floor);
  if (wx.w === 'rain' || wx.w === 'storm') D.drawRain(ctx, t, wx.k, S.wind, wx.w === 'storm', W, H);
  if (wx.w === 'snow' || pal.snowline > .5 && wx.w === 'cloudy') D.drawSnow(ctx, t, wx.w === 'snow' ? wx.k : .4 * wx.k, W, H);
  return { src, srcVis, horizon, floor, wTop: floor, layerGeom: geom };
}
