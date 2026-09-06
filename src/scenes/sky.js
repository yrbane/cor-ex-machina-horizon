import { clamp, lerp, hash, TAU } from '../util.js';
import { hsl, HUES } from '../palette.js';
import { drawBody } from '../draw/bodies.js';
import { drawAurora } from '../draw/weather.js';
import { drawCloud } from '../draw/clouds.js';
import { bodyVisibility } from '../sky.js';

// Ciel commun aux scènes : fond, crépuscule, assombrissement météo, étoiles, aurore.
// biome (facultatif) : couleurs de jour propres à la scène, mélangées avec la nuit commune selon sky.day.
export function drawSky(ctx, S, horizon, biome) {
  const { W, H, sky, wx, lvl, hue, kickFlash, tn, stars, parX, parY, disp, t } = S, hb = (HUES.bass + hue) % 360, hs = (HUES.sub + hue) % 360;
  const bottomY = biome && biome.floorTo ? biome.floorTo : horizon + H * .06;
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  if (biome) {
    // Nuit commune vers jour du biome
    g.addColorStop(0, `hsl(${hb},40%,${4 + lvl * 3}%)`); g.addColorStop(1, `hsl(${hs},60%,${16 + lvl * 10 + kickFlash * 20}%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, bottomY);
    if (sky.day > 0) { const d = ctx.createLinearGradient(0, 0, 0, horizon); d.addColorStop(0, biome.top); d.addColorStop(1, biome.bottom); ctx.globalAlpha = sky.day; ctx.fillStyle = d; ctx.fillRect(0, 0, W, bottomY); ctx.globalAlpha = 1; }
  } else {
    g.addColorStop(0, `hsl(${lerp(hb, 215, sky.day)},${lerp(40, 55, sky.day)}%,${lerp(4 + lvl * 3, 52, sky.day)}%)`);
    g.addColorStop(.7, `hsl(${lerp(hs, 208, sky.day)},${lerp(45, 50, sky.day)}%,${lerp(9 + lvl * 6, 66, sky.day)}%)`);
    g.addColorStop(1, `hsl(${lerp(hs, 200, sky.day)},${lerp(60, 45, sky.day)}%,${lerp(16 + lvl * 10 + kickFlash * 20, 78, sky.day)}%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, bottomY);
  }
  if (sky.dusk > .02) { const d = ctx.createLinearGradient(0, horizon * .45, 0, horizon); d.addColorStop(0, hsl(hue, 'sub', 85, 50, 0)); d.addColorStop(1, hsl(hue, 'sub', 85, 50, sky.dusk * .55)); ctx.fillStyle = d; ctx.fillRect(0, 0, W, horizon); }
  if (wx.dark > 0) { ctx.fillStyle = `rgba(8,10,18,${wx.dark * .5})`; ctx.fillRect(0, 0, W, horizon); }
  const starA = (1 - sky.day) * (1 - wx.dark), starShift = (t / 3600) % 1;
  if (starA > .02) for (const s of stars) { const x = (((s.x - starShift * .5 - parX * .02) % 1) + 1) % 1 * W, y = (s.y - parY * .02) * horizon, tw = .5 + .5 * Math.sin(tn * 2 + s.p); ctx.fillStyle = `rgba(${s.col},${(.25 + tw * .35 + disp.high * .3) * starA})`; ctx.fillRect(x, y, s.s, s.s); }
  if (wx.w === 'aurora' && starA > .4) drawAurora(ctx, tn, wx.k * starA, horizon, W, hue, disp.mid);
}

// Astres, un seul à la fois, découpés au-dessus de l'horizon ; ondes des coups depuis l'astre visible
export function drawBodies(ctx, S, horizon) {
  const { W, H, sky, wx, disp, hue, kickFlash, tn, dt, parX, parY, waves, makeLayer } = S;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, horizon); ctx.clip();
  const rSun = Math.min(W, H) * (.075 + disp.sub * .05 + kickFlash * .02) * (.8 + hash(sky.n + .3) * .5), rMoon = Math.min(W, H) * (.05 + disp.sub * .012) * (.75 + hash(sky.n + .7) * .7);
  const bodies = [];
  if (sky.moon.up) bodies.push({ kind: 'moon', n: sky.n, alt: sky.moon.alt, x: sky.moon.x * W - parX * W * .02, y: horizon - sky.moon.alt * H + parY * H * .015, r: rMoon });
  if (sky.sun.up) bodies.push({ kind: 'sun', n: sky.n, alt: sky.sun.alt, x: sky.sun.x * W - parX * W * .03, y: horizon - sky.sun.alt * H + parY * H * .02, r: rSun });
  for (const bd of bodies) drawBody(ctx, bd, sky, disp.sub, wx, hue, tn, makeLayer);
  const src = bodies[0], srcVis = src ? bodyVisibility(src, horizon) : 0;
  if (src) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = waves.length - 1; i >= 0; i--) { const w = waves[i]; w.r += dt * W * .9; w.a *= Math.exp(-dt * 2.4); if (w.a < .02) { waves.splice(i, 1); continue; } ctx.strokeStyle = hsl(hue, 'sub', 85, 70, w.a * srcVis * (src.kind === 'sun' ? 1 : .5)); ctx.lineWidth = 2 + 6 * w.a; ctx.beginPath(); ctx.arc(src.x, src.y, src.r + w.r, 0, TAU); ctx.stroke(); }
  } else waves.length = 0;
  ctx.restore(); ctx.globalCompositeOperation = 'source-over';
  return { src, srcVis, rSun };
}

// Traits de lumière qui filent avec le niveau
export function drawStreaks(ctx, S, horizon) {
  const { W, sky, disp, hue, lvl, dt, parY, streaks, rng } = S;
  ctx.globalCompositeOperation = 'lighter';
  for (const s of streaks) { const e = disp[s.band]; s.x -= dt * s.v * (.04 + lvl * .25 + e * .3); if (s.x < -.1) { s.x = 1.1; s.y = .1 + rng() * .7; } const x = s.x * W, y = (s.y - parY * .05 * s.v) * horizon, len = s.len * W * (.5 + lvl + e); ctx.strokeStyle = hsl(hue, s.band, 80, 65, (.35 * e + .06) * (1 - sky.day * .7)); ctx.lineWidth = 1 + e * 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
}

// Nuages en sprites, colorés par la lumière du moment
export function drawClouds(ctx, S, horizon) {
  const { W, sky, wx, hue, dt, wind, parX, parY, clouds, cloudSprites, rng } = S, hb = (HUES.bass + hue) % 360, hs = (HUES.sub + hue) % 360;
  for (const c of clouds) {
    c.x -= dt * wind * c.depth; if (c.x < -.3) { c.x = 1.3; c.y = .12 + (1 - c.depth) * .25 + rng() * .15; }
    const cx = (c.x - parX * .03 * c.depth) * W, cy = (c.y - parY * .02 * c.depth) * horizon, s = c.size * W;
    const light = { hue: sky.dusk > sky.day ? hs : lerp(hb, 215, sky.day), sat: lerp(25, 12, sky.day) + sky.dusk * 45 - wx.dark * 10, l: lerp(14 + c.depth * 4, 88, sky.day) + sky.dusk * 12 - wx.dark * 30, a: .55 + c.depth * .3 + wx.dark * .2 };
    drawCloud(ctx, c, cloudSprites.get(c, light, s), cx, cy, s);
  }
}
