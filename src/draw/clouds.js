import { TAU } from '../util.js';

// Nuages : bourgeons modelés par des dégradés, rendus une fois dans un sprite par éclairage, puis réutilisés

export function makeCloud(rng) {
  const depth = .3 + rng() * .7, n = 4 + Math.floor(rng() * 4), parts = [];
  for (let i = 0; i < n; i++) parts.push({ dx: (i / (n - 1) - .5) * 1.6, dy: -Math.abs(i / (n - 1) - .5) * .5 + rng() * .2, r: .45 + rng() * .45 });
  return { x: rng() * 1.3 - .15, y: .12 + (1 - depth) * .25 + rng() * .15, depth, size: .05 + depth * .07, parts, key: null, sprite: null };
}

// Clé d'éclairage quantifiée : teinte par 10°, lumière par 4 %, saturation par 8 %, opacité par 0,1, et la taille en pixels
export const cloudKey = (light, px) => `${Math.round(light.hue / 10)}|${Math.round(light.sat / 8)}|${Math.round(light.l / 4)}|${Math.round(light.a * 10)}|${Math.round(px)}`;

export class CloudSprites {
  constructor(makeCanvas) { this.make = makeCanvas; }
  // Rend le nuage dans son sprite si l'éclairage ou la taille ont changé, sinon renvoie le sprite existant
  get(cloud, light, px) {
    const key = cloudKey(light, px);
    if (cloud.key === key && cloud.sprite) return cloud.sprite;
    const s = px, pad = s * .6, w = Math.ceil(s * 2.4), h = Math.ceil(s * 1.6), L = this.make(w, h), c = L.ctx, cx = w / 2, cy = h * .62;
    const col = (dl, a) => `hsla(${light.hue},${light.sat}%,${Math.max(0, Math.min(100, light.l + dl))}%,${a})`;
    // Ombre portée sous le nuage
    c.fillStyle = col(-18, light.a * .5); c.beginPath(); for (const p of cloud.parts) c.ellipse(cx + p.dx * s, cy + p.dy * s + s * .16, p.r * s * .46, p.r * s * .32, 0, 0, TAU); c.fill();
    // Corps : chaque bourgeon éclairé par le haut à gauche, ombré vers le bas
    for (const p of cloud.parts) {
      const bx = cx + p.dx * s, by = cy + p.dy * s, br = p.r * s * .45;
      const g = c.createRadialGradient(bx - br * .35, by - br * .4, br * .1, bx, by, br);
      g.addColorStop(0, col(10, light.a)); g.addColorStop(.6, col(0, light.a)); g.addColorStop(1, col(-14, light.a * .95));
      c.fillStyle = g; c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill();
    }
    // Base plate légèrement plus sombre, comme un cumulus
    c.fillStyle = col(-8, light.a * .9); c.beginPath(); c.ellipse(cx, cy + s * .12, s * .95, s * .16, 0, 0, TAU); c.fill();
    cloud.key = key; cloud.sprite = L; void pad;
    return L;
  }
}

// Dessine un nuage à l'écran depuis son sprite, centré sur (x, y)
export function drawCloud(ctx, cloud, sprite, x, y, px) {
  const w = Math.ceil(px * 2.4), h = Math.ceil(px * 1.6);
  ctx.drawImage(sprite.canvas, Math.round(x - w / 2), Math.round(y - h * .62), w, h);
}
