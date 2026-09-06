import { clamp, lerp, hash, TAU } from './util.js';

// Cycle jour / nuit : 15 minutes. Le soleil occupe la première moitié, la lune la seconde, jamais ensemble.
export const PERIOD = 900;

// Trajectoire d'un astre pendant sa moitié de cycle : lever à gauche, coucher à droite, points et hauteur tirés par cycle
function arc(uu, seed) {
  const x0 = .08 + hash(seed) * .25, x1 = .92 - hash(seed + 7) * .25, hmax = .2 + hash(seed + 3) * .22;
  const el = Math.sin(uu * TAU);
  return { up: el > .003, x: lerp(x0, x1, clamp(uu * 2, 0, 1)), el, alt: el * hmax };
}

export function skyState(t) {
  const n = Math.floor(t / PERIOD), u = (t % PERIOD) / PERIOD;
  const sun = arc(u, n * 2), moon = arc((u + .5) % 1, n * 2 + 1);
  const day = clamp(sun.el * 2.2, 0, 1), dusk = clamp(1 - Math.abs(sun.el) * 4, 0, 1);
  return { u, n, sun, moon, day, dusk, phase: hash(n + .3) };
}

// Part du disque d'un astre au-dessus de la ligne d'horizon (0 : caché, 1 : entier)
export const bodyVisibility = (b, horizon) => clamp((horizon - b.y + b.r) / (2 * b.r), 0, 1);
