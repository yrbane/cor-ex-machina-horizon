import { clamp, lerp, hash, TAU } from '../util.js';
import { CITY_TYPES, BEHIND_CLOUDS, TYPES } from '../events.js';
import { makeBiomeCycle, mix } from './biome.js';
import { layerValue } from '../draw/landscape.js';

// Scène « Ville » : les plans de loudness deviennent des rues d'immeubles, la route au premier plan, trafic et passants.
export const CITY_BIOMES = ['modern', 'old', 'neon'];
const cityCycle = makeBiomeCycle(CITY_BIOMES, 300, 41);
export const cityBiomeAt = t => cityCycle.at(t);
export const cityGeometry = H => ({ horizon: H * .56, ground: H * .80 });
const cityCol = (c, dl = 0, a = 1) => `hsla(${c.h},${c.s}%,${clamp(c.l + dl, 0, 100)}%,${a})`;
// Palettes : immeubles du lointain au proche, fenêtres, route, ciel de jour, enseignes
const CITY_PAL = {
  modern: { layers: [{ h: 215, s: 18, l: 62 }, { h: 215, s: 20, l: 50 }, { h: 218, s: 22, l: 38 }, { h: 220, s: 24, l: 28 }], win: { h: 195, s: 80, l: 70 }, road: { h: 220, s: 10, l: 24 }, sky: { top: { h: 212, s: 55, l: 54 }, bottom: { h: 205, s: 45, l: 80 } }, neon: 0, spires: 0 },
  old:    { layers: [{ h: 30, s: 30, l: 62 }, { h: 26, s: 38, l: 52 }, { h: 22, s: 42, l: 42 }, { h: 18, s: 45, l: 32 }], win: { h: 40, s: 90, l: 65 }, road: { h: 30, s: 15, l: 30 }, sky: { top: { h: 208, s: 50, l: 58 }, bottom: { h: 35, s: 45, l: 82 } }, neon: 0, spires: 1 },
  neon:   { layers: [{ h: 265, s: 25, l: 30 }, { h: 270, s: 30, l: 22 }, { h: 275, s: 35, l: 16 }, { h: 280, s: 40, l: 10 }], win: { h: 320, s: 90, l: 65 }, road: { h: 270, s: 20, l: 12 }, sky: { top: { h: 260, s: 45, l: 30 }, bottom: { h: 300, s: 50, l: 45 } }, neon: 1, spires: 0 },
};
export function cityPalette({ b, prev, k }) {
  const A = CITY_PAL[prev] || CITY_PAL[b], B = CITY_PAL[b];
  return { layers: B.layers.map((c, i) => mix(A.layers[i], c, k)), win: mix(A.win, B.win, k), road: mix(A.road, B.road, k), sky: { top: mix(A.sky.top, B.sky.top, k), bottom: mix(A.sky.bottom, B.sky.bottom, k) }, neon: lerp(A.neon, B.neon, k), spires: lerp(A.spires, B.spires, k), b, k };
}

// Une rue d'immeubles : la courbe du plan est échantillonnée par parcelles, chaque parcelle est un immeuble
function drawStreet(ctx, S, L, i, y0, amp, c, pal, night) {
  const { W, t, parX, tn } = S, depth = i / 3, px = W / 2 - parX * W * (.01 + depth * .05), t0 = t - L.win / 2;
  const n = 18 + i * 8, bw = W / n, winCol = cityCol(pal.win), lit = night * (.55 + .3 * pal.neon);
  ctx.fillStyle = cityCol(c, -(1 - night) * 0 - night * 22);
  for (let k = 0; k < n; k++) {
    const x = k * bw, tt = t0 + (x + bw / 2 - px) / W * L.win, v = layerValue(L, tt); if (v <= 0) continue;
    const seed = Math.floor(tt / (L.win / n)) * 7.1 + i, h = v * amp * (.7 + hash(seed) * .5), top = y0 - h, gap = bw * (.08 + hash(seed + .3) * .12), w = bw - gap;
    ctx.fillStyle = cityCol(c, -night * 22 + (hash(seed + .7) - .5) * 6); ctx.fillRect(x + gap / 2, top, w, h);
    if (pal.spires > .5 && hash(seed + .9) > .8) { ctx.beginPath(); ctx.moveTo(x + gap / 2, top); ctx.lineTo(x + bw / 2, top - h * .35); ctx.lineTo(x + bw - gap / 2, top); ctx.fill(); }   // clocher
    if (hash(seed + .5) > .7) ctx.fillRect(x + bw / 2 - 1, top - h * .12, 2, h * .12);                                                          // antenne
    if (i >= 1 && h > 12) {   // fenêtres, allumées la nuit selon un tirage stable
      const rows = Math.max(1, Math.floor(h / (bw * .35))), cols = Math.max(1, Math.floor(w / (bw * .3)));
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const on = hash(seed * 3 + r * 1.3 + q * .7) < lit || (!night && hash(seed + r + q) > .85);
        ctx.fillStyle = on ? `hsla(${pal.win.h},${pal.win.s}%,${pal.win.l}%,${.55 + .45 * night})` : `hsla(${c.h},${c.s}%,${clamp(c.l - 30 + night * 6, 0, 100)}%,.6)`;
        ctx.fillRect(x + gap / 2 + w * (.12 + q * .76 / cols), top + h * (.08 + r * .84 / rows), w * .5 / cols, h * .5 / rows);
      }
    }
    if (pal.neon > .3 && i === 3 && hash(seed + .2) > .6) {   // enseigne au néon
      const hh = (hash(seed + .4) * 360) | 0, blink = Math.sin(tn * 3 + seed) > -.2 ? 1 : .2;
      ctx.fillStyle = `hsla(${hh},95%,65%,${.8 * pal.neon * blink})`; ctx.fillRect(x + gap / 2 + w * .1, top + h * .3, w * .8, Math.max(2, h * .08));
      ctx.fillStyle = `hsla(${hh},95%,65%,${.25 * pal.neon * blink})`; ctx.fillRect(x + gap / 2, top + h * .25, w, Math.max(4, h * .18));
    }
  }
}

function drawRoad(ctx, S, pal, ground, night) {
  const { W, H, t, tn } = S;
  ctx.fillStyle = cityCol(pal.road, -4); ctx.fillRect(0, ground, W, H - ground);
  ctx.fillStyle = cityCol(pal.road, 18); ctx.fillRect(0, ground, W, H * .012);                                                    // trottoir du fond
  ctx.fillStyle = cityCol(pal.road); ctx.fillRect(0, ground + H * .03, W, H * .10);                                               // chaussée
  ctx.fillStyle = 'rgba(255,255,255,.35)'; const dash = W * .04, off = ((t * .18) % 1) * dash * 2; for (let x = -off; x < W; x += dash * 2) ctx.fillRect(x, ground + H * .078, dash, Math.max(1, H * .003));   // ligne médiane
  ctx.fillStyle = cityCol(pal.road, 14); ctx.fillRect(0, ground + H * .13, W, H - ground - H * .13);                                // trottoir avant
  for (let x = W * .08; x < W; x += W * .22) {   // lampadaires, allumés la nuit
    ctx.fillStyle = cityCol(pal.road, -12); ctx.fillRect(x - 1.5, ground - H * .07, 3, H * .1); ctx.fillRect(x - H * .012, ground - H * .07, H * .024, H * .006);
    if (night > .2) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, ground - H * .07, 0, x, ground - H * .07, H * .09); g.addColorStop(0, `rgba(255,220,150,${.35 * night})`); g.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, ground - H * .07, H * .09, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  }
}

export function renderCity(ctx, S, D) {
  const { W, H, t, sky, wx, disp, layers, events } = S, g = cityGeometry(H), horizon = g.horizon, ground = g.ground, night = 1 - sky.day;
  const pal = cityPalette(cityBiomeAt(t));
  D.drawSky(ctx, S, horizon, { top: cityCol(pal.sky.top), bottom: cityCol(pal.sky.bottom), floorTo: ground });
  const { src, srcVis } = D.drawBodies(ctx, S, horizon);
  D.drawStreaks(ctx, S, horizon);
  for (const e of events) if (BEHIND_CLOUDS.includes(e.type)) D.drawEvent(ctx, e, { ...S, horizon, wTop: ground }, sky);
  D.drawClouds(ctx, S, horizon);
  if (wx.rainbow > 0 && sky.day > .3 && src && src.kind === 'sun') D.drawRainbow(ctx, wx.rainbow * sky.day, src.x, horizon, W, H);
  // Lueur urbaine la nuit, brume de jour
  { const hz = ctx.createLinearGradient(0, horizon - H * .1, 0, ground); hz.addColorStop(0, cityCol(pal.sky.bottom, -night * 50, 0)); hz.addColorStop(1, pal.neon > .3 ? `hsla(${pal.win.h},60%,40%,${.35 * night + .15})` : cityCol(pal.layers[0], 10 - night * 30, .9)); ctx.fillStyle = hz; ctx.fillRect(0, horizon - H * .1, W, ground - horizon + H * .1); }
  for (const e of events) if ((TYPES[e.type].where || 'sky') === 'sky' && !BEHIND_CLOUDS.includes(e.type)) D.drawEvent(ctx, e, { ...S, horizon, wTop: ground }, sky);
  const geom = i => ({ y0: horizon + (ground - horizon) * (.3 + i * .233), amp: H * layers[i].h * 1.5 * (.85 + disp[layers[i].band] * .15) });
  layers.forEach((L, i) => { const { y0, amp } = geom(i); drawStreet(ctx, S, L, i, y0, amp, pal.layers[Math.min(i, 3)], pal, night); if (i === 1 && wx.w === 'fog') D.drawFog(ctx, wx.k, ground, W, H); });
  drawRoad(ctx, S, pal, ground, night);
  for (const e of events) if (CITY_TYPES.includes(e.type)) D.drawEvent(ctx, e, { ...S, horizon, wTop: ground, night }, sky);
  if (wx.w === 'rain' || wx.w === 'storm') D.drawRain(ctx, t, wx.k, S.wind, wx.w === 'storm', W, H);
  if (wx.w === 'snow') D.drawSnow(ctx, t, wx.k, W, H);
  return { src, srcVis, horizon, wTop: ground + H * .16, layerGeom: geom };
}
