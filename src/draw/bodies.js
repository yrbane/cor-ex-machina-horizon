import { clamp, lerp, hash, TAU } from '../util.js';
import { HUES } from '../palette.js';

// Astres : taille, teinte et détails différents à chaque cycle ; plus gros et plus roux au ras de l'horizon
export function drawBody(ctx, bd, sky, pulse, wx, hue, tn) {
  const { x, y, kind, n, alt } = bd, low = clamp(1 - alt / .12, 0, 1), r = bd.r * (1 + low * .22);
  if (kind === 'sun') drawSun(ctx, x, y, r, n, low, sky, pulse, wx, hue, tn);
  else drawMoon(ctx, x, y, r, n, low, sky, pulse, hue);
  ctx.globalCompositeOperation = 'source-over';
}

function drawSun(ctx, x, y, r, n, low, sky, pulse, wx, hue, tn) {
  const hueS = (sky.day > .5 ? 46 : 26) - low * 14 + (hash(n + .31) - .5) * 10, sat = 92 - wx.dark * 40;
  const sh = (ss, l, a) => `hsla(${hueS},${Math.max(0, ss)}%,${l}%,${a})`;
  const squash = 1 - low * low * .22, l = 62 - low * 10 - wx.dark * 8, haloR = r * (2.8 + hash(n + .5) * 1.4 + wx.dark * 1.5);
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
  halo.addColorStop(0, sh(sat, l, .85 - wx.dark * .3)); halo.addColorStop(.3, sh(sat, l - 8, .32 + sky.dusk * .2)); halo.addColorStop(1, sh(sat, 40, 0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, haloR, 0, TAU); ctx.fill();
  if (sky.dusk > .15 && wx.dark < .3) { // couronne : rayons doux qui tournent lentement
    ctx.globalAlpha = sky.dusk * .35; ctx.fillStyle = sh(sat, 70, .5);
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + tn * .05 * (i % 2 ? 1 : -1), len = r * (1.8 + hash(n + i) * 1.6), w = .06 + hash(n + i + .5) * .08; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a - w) * len, y + Math.sin(a - w) * len); ctx.lineTo(x + Math.cos(a + w) * len, y + Math.sin(a + w) * len); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(1, squash);
  ctx.fillStyle = sh(sat, 74 + pulse * 12 - low * 14, .97 - wx.dark * .25); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  if (sky.day > .6 && wx.dark < .2) { // taches solaires, placées selon le cycle
    ctx.globalCompositeOperation = 'source-over'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    const ns = 2 + Math.floor(hash(n + .77) * 3);
    for (let i = 0; i < ns; i++) {
      const a = hash(n + i * 3.1) * TAU, d = (.25 + hash(n + i * 1.7) * .5) * r, sx = Math.cos(a) * d, sy = Math.sin(a) * d * .6, sr = r * (.03 + hash(n + i * .9) * .05);
      ctx.fillStyle = sh(sat, 45, .35); ctx.beginPath(); ctx.ellipse(sx, sy, sr * 1.6, sr, a, 0, TAU); ctx.fill();
      ctx.fillStyle = sh(sat, 30, .45); ctx.beginPath(); ctx.ellipse(sx, sy, sr * .8, sr * .5, a, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

function drawMoon(ctx, x, y, r, n, low, sky, pulse, hue) {
  // Teinte : pâle le plus souvent, parfois rousse, parfois bleutée, et rousse près de l'horizon
  const tint = hash(n + .91), base = tint < .15 ? [32, 55, 74] : tint < .27 ? [215, 22, 88] : [46, 9, 91];
  const hueM = lerp(base[0], 28, low * .8), satM = lerp(base[1], 60, low * .8), lM = lerp(base[2], 72, low * .6) + pulse * 6;
  const mc = (dl, a) => `hsla(${hueM},${satM}%,${lM + dl}%,${a})`;
  ctx.globalCompositeOperation = 'lighter';
  const hr = r * (2.2 + hash(n + .2)), halo = ctx.createRadialGradient(x, y, 0, x, y, hr);
  halo.addColorStop(0, mc(-10, .4 + pulse * .2)); halo.addColorStop(.4, mc(-10, .1)); halo.addColorStop(1, mc(-20, 0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, hr, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.translate(x, y); ctx.rotate(hash(n + .4) * TAU);
  ctx.fillStyle = mc(0, .98); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  // Mers : larges taches sombres aux bords doux
  const nm = 4 + Math.floor(hash(n + .61) * 4);
  for (let i = 0; i < nm; i++) {
    const a = hash(n * 3 + i) * TAU, d = hash(n * 5 + i) * r * .7, mx = Math.cos(a) * d, my = Math.sin(a) * d, mr = r * (.14 + hash(n * 7 + i) * .22);
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, mr); g.addColorStop(0, mc(-26, .5)); g.addColorStop(.7, mc(-22, .35)); g.addColorStop(1, mc(-20, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(mx, my, mr * (1 + hash(n + i) * .5), mr, a, 0, TAU); ctx.fill();
  }
  // Cratères : fond ombré, bord éclairé côté soleil
  const nc = 7 + Math.floor(hash(n + .83) * 8);
  for (let i = 0; i < nc; i++) {
    const a = hash(n * 11 + i) * TAU, d = hash(n * 13 + i) * r * .85, cx = Math.cos(a) * d, cy = Math.sin(a) * d, cr = r * (.03 + hash(n * 17 + i) * .07);
    ctx.fillStyle = mc(-18, .45); ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill();
    ctx.fillStyle = mc(-8, .5); ctx.beginPath(); ctx.arc(cx + cr * .25, cy - cr * .2, cr * .6, 0, TAU); ctx.fill();
    ctx.strokeStyle = mc(8, .45); ctx.lineWidth = Math.max(.6, cr * .18); ctx.beginPath(); ctx.arc(cx, cy, cr, 3.6, 5.6); ctx.stroke();
  }
  ctx.restore();
  // Phase : un disque sombre décalé masque une partie du disque, différemment à chaque cycle
  const ph = (sky.phase - .5) * 2, off = ph * r * 1.6;
  if (Math.abs(ph) > .12) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(8,10,20,.88)'; ctx.beginPath(); ctx.arc(x + off, y - r * .15, r * 1.05, 0, TAU); ctx.fill(); ctx.restore(); }
}
