import { clamp, lerp, hash } from '../util.js';

// Eau : base colorée par le ciel, reflet découpé en tranches décalées par des ondulations, scintillements sous l'astre
export function drawWater(ctx, back, bctx, cv, p) {
  const { W, H, horizon, wTop, tn, sky, wx, lvl, bass, hs, hb, src, srcVis, reduced } = p, wH = H - wTop, bh = H * .46, by = horizon - H * .4;
  bctx.clearRect(0, 0, W, back.height); bctx.drawImage(cv, 0, by, W, bh, 0, 0, W, bh);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = `hsl(${lerp(hs, 205, sky.day)},${lerp(50, 40, sky.day)}%,${lerp(5 + lvl * 3, 26, sky.day)}%)`; ctx.fillRect(0, wTop, W, wH);
  const swell = reduced ? 0 : (.6 + lvl * .8 + bass * .6) * (wx.w === 'storm' ? 2.2 : wx.w === 'rain' ? 1.5 : 1) * W / 960;
  for (let y = 0; y < wH; y += 3) {
    const d = y / wH, srcY = bh - Math.pow(d, .85) * bh * .95;
    const dx = (Math.sin(y * .075 + tn * 2.1) * (1 + d * 7) + Math.sin(y * .21 - tn * 3.3) * d * 3 + Math.sin(y * .04 + tn * .9) * d * 4) * swell;
    const dy = Math.sin(y * .15 + tn * 2.6) * d * 1.5 * swell;
    ctx.globalAlpha = .42 * (1 - d * .85);
    ctx.drawImage(back, 0, Math.max(0, srcY - 1 + dy), W, 4, dx, wTop + y, W, 3);
  }
  ctx.globalAlpha = 1;
  if (src && srcVis > .05) {
    ctx.globalCompositeOperation = 'lighter'; const moonish = src.kind === 'moon';
    for (let i = 0; i < 34; i++) {
      const d = hash(i + 77), y = wTop + d * wH * .9, flick = .5 + .5 * Math.sin(tn * (2 + hash(i + 5) * 3) + i * 1.7);
      const w = (6 + d * 70) * W / 960, x = src.x + Math.sin(tn * 1.3 + i * .9) * d * W * .04 + (hash(i + 21) - .5) * d * W * .12;
      const a = (moonish ? .18 : .28) * flick * (1 - d) * (1 - wx.dark * .6) * srcVis;
      ctx.fillStyle = moonish ? `hsla(${hb},20%,90%,${a})` : `hsla(${sky.day > .5 ? 42 : hs},85%,72%,${a})`;
      ctx.fillRect(x - w / 2, y, w, Math.max(1, H * .002));
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  const water = ctx.createLinearGradient(0, wTop, 0, H);
  water.addColorStop(0, `rgba(6,7,12,${lerp(.05, 0, sky.day)})`); water.addColorStop(1, `rgba(6,7,12,${lerp(.85, .55, sky.day)})`);
  ctx.fillStyle = water; ctx.fillRect(0, wTop, W, wH);
}
