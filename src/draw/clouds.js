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
    // Aplats, sans dégradé : corps, ombre plate dans la moitié basse de chaque bourgeon, rehaut plat en haut à gauche
    const puffs = cloud.parts.map(p => ({ x: cx + p.dx * s, y: cy + p.dy * s, r: p.r * s * .45 }));
    c.fillStyle = col(-16, light.a * .55); c.beginPath(); for (const p of puffs) c.ellipse(p.x, p.y + s * .14, p.r * 1.02, p.r * .55, 0, 0, TAU); c.fill();   // ombre portée
    c.fillStyle = col(0, light.a); c.beginPath(); for (const p of puffs) { c.moveTo(p.x + p.r, p.y); c.arc(p.x, p.y, p.r, 0, TAU); } c.fill();                  // corps, en une seule forme
    for (const p of puffs) {                                                                                                                                // ombre plate, moitié basse
      c.save(); c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.clip();
      c.fillStyle = col(-11, light.a * .9); c.beginPath(); c.ellipse(p.x + p.r * .1, p.y + p.r * .55, p.r * 1.1, p.r * .6, 0, 0, TAU); c.fill();
      c.fillStyle = col(8, light.a * .8); c.beginPath(); c.arc(p.x - p.r * .35, p.y - p.r * .4, p.r * .38, 0, TAU); c.fill();                            // rehaut plat
      c.restore();
    }
    c.fillStyle = col(-7, light.a * .9); c.beginPath(); c.ellipse(cx, cy + s * .12, s * .95, s * .14, 0, 0, TAU); c.fill();                                 // base plate de cumulus
    cloud.key = key; cloud.sprite = L; void pad;
    return L;
  }
}

// Dessine un nuage à l'écran depuis son sprite, centré sur (x, y)
export function drawCloud(ctx, cloud, sprite, x, y, px) {
  const w = Math.ceil(px * 2.4), h = Math.ceil(px * 1.6);
  ctx.drawImage(sprite.canvas, Math.round(x - w / 2), Math.round(y - h * .62), w, h);
}
