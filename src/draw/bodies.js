import { clamp, lerp, hash, TAU } from '../util.js';
import { HUES } from '../palette.js';

// Astres : taille, teinte et détails différents à chaque cycle ; plus gros et plus roux au ras de l'horizon
// makeLayer(w, h) fournit un calque transparent réutilisable { canvas, ctx } : la lune y est dessinée puis reportée
export function drawBody(ctx, bd, sky, pulse, wx, hue, tn, makeLayer) {
  const { x, y, kind, n, alt } = bd, low = clamp(1 - alt / .12, 0, 1), r = bd.r * (1 + low * .22);
  if (kind === 'sun') drawSun(ctx, x, y, r, n, low, sky, pulse, wx, hue, tn);
  else drawMoon(ctx, x, y, r, n, low, sky, pulse, hue, makeLayer);
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

function drawMoon(ctx, x, y, r, n, low, sky, pulse, hue, makeLayer) {
  // Teinte : pâle le plus souvent, parfois rousse, parfois bleutée, et rousse près de l'horizon
  const tint = hash(n + .91), base = tint < .15 ? [32, 55, 74] : tint < .27 ? [215, 22, 88] : [46, 9, 91];
  const hueM = lerp(base[0], 28, low * .8), satM = lerp(base[1], 60, low * .8), lM = lerp(base[2], 72, low * .6) + pulse * 6;
  const mc = (dl, a) => `hsla(${hueM},${satM}%,${lM + dl}%,${a})`;
  // Tout se dessine sur un calque transparent centré sur la lune, halo compris
  const hr = r * (2.2 + hash(n + .2)), size = Math.ceil(hr * 2 + 4), L = makeLayer(size, size), c = L.ctx, cx = size / 2, cy = size / 2;
  const halo = c.createRadialGradient(cx, cy, 0, cx, cy, hr);
  halo.addColorStop(0, mc(-10, .4 + pulse * .2)); halo.addColorStop(.4, mc(-10, .1)); halo.addColorStop(1, mc(-20, 0));
  c.fillStyle = halo; c.beginPath(); c.arc(cx, cy, hr, 0, TAU); c.fill();
  c.save(); c.translate(cx, cy); c.rotate(hash(n + .4) * TAU);
  c.fillStyle = mc(0, .98); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
  // Mers : larges taches sombres aux bords doux
  const nm = 4 + Math.floor(hash(n + .61) * 4);
  for (let i = 0; i < nm; i++) {
    const a = hash(n * 3 + i) * TAU, d = hash(n * 5 + i) * r * .7, mx = Math.cos(a) * d, my = Math.sin(a) * d, mr = r * (.14 + hash(n * 7 + i) * .22);
    const g = c.createRadialGradient(mx, my, 0, mx, my, mr); g.addColorStop(0, mc(-26, .5)); g.addColorStop(.7, mc(-22, .35)); g.addColorStop(1, mc(-20, 0));
    c.fillStyle = g; c.beginPath(); c.ellipse(mx, my, mr * (1 + hash(n + i) * .5), mr, a, 0, TAU); c.fill();
  }
  // Cratères : fond ombré, bord éclairé côté soleil
  const nc = 7 + Math.floor(hash(n + .83) * 8);
  for (let i = 0; i < nc; i++) {
    const a = hash(n * 11 + i) * TAU, d = hash(n * 13 + i) * r * .85, kx = Math.cos(a) * d, ky = Math.sin(a) * d, cr = r * (.03 + hash(n * 17 + i) * .07);
    c.fillStyle = mc(-18, .45); c.beginPath(); c.arc(kx, ky, cr, 0, TAU); c.fill();
    c.fillStyle = mc(-8, .5); c.beginPath(); c.arc(kx + cr * .25, ky - cr * .2, cr * .6, 0, TAU); c.fill();
    c.strokeStyle = mc(8, .45); c.lineWidth = Math.max(.6, cr * .18); c.beginPath(); c.arc(kx, ky, cr, 3.6, 5.6); c.stroke();
  }
  c.restore();
  // Phase : la partie dans l'ombre est effacée du calque, halo et contour compris ; le ciel apparaît à travers
  const ph = (sky.phase - .5) * 2, off = ph * r * 1.6;
  if (Math.abs(ph) > .12) {
    c.globalCompositeOperation = 'destination-out';
    const sr = r * 1.05, sx = cx + off, sy = cy - r * .15, g = c.createRadialGradient(sx, sy, sr * .93, sx, sy, sr);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');                                             // terminateur adouci
    c.fillStyle = 'rgba(0,0,0,1)'; c.beginPath(); c.arc(sx, sy, sr * .93, 0, TAU); c.fill();
    c.fillStyle = g; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
    // Le halo suit le croissant : effacé progressivement côté ombre, pour ne pas dessiner un trou rond dans la lueur
    const gh = c.createRadialGradient(sx, sy, sr, sx, sy, hr); gh.addColorStop(0, 'rgba(0,0,0,1)'); gh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gh; c.beginPath(); c.arc(sx, sy, hr, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(L.canvas, Math.round(x - cx), Math.round(y - cy));
}
