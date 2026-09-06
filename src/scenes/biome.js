import { clamp, lerp, hash } from '../util.js';

// Biomes de la vallée : segments de quatre minutes, jamais deux fois le même de suite, transition douce de vingt secondes
export const BIOMES = ['green', 'desert', 'snow'];
export const BSEG = 240;
const seq = [];
function biomeOf(seg) {
  if (seg < 0) return BIOMES[0];
  while (seq.length <= seg) {
    const i = seq.length, prev = i ? seq[i - 1] : null, choices = BIOMES.filter(b => b !== prev);
    seq.push(choices[Math.floor(hash(i * 2.3 + 17) * choices.length)]);
  }
  return seq[seg];
}
export function biomeAt(t) {
  const seg = Math.floor(t / BSEG), local = t - seg * BSEG;
  return { b: biomeOf(seg), prev: biomeOf(seg - 1), k: clamp(local / 20, 0, 1), seg };
}

// Palettes : plans du lointain au proche, sol, ciel, végétation
const PAL = {
  green:  { layers: [{ h: 150, s: 30, l: 34 }, { h: 140, s: 38, l: 30 }, { h: 125, s: 42, l: 30 }, { h: 110, s: 45, l: 28 }], floor: { h: 105, s: 40, l: 32 }, sky: { top: { h: 210, s: 55, l: 52 }, bottom: { h: 200, s: 40, l: 78 } }, veg: 'pine', snowline: 0 },
  desert: { layers: [{ h: 28, s: 40, l: 52 }, { h: 26, s: 48, l: 46 }, { h: 22, s: 55, l: 42 }, { h: 18, s: 60, l: 38 }], floor: { h: 36, s: 45, l: 58 }, sky: { top: { h: 205, s: 60, l: 56 }, bottom: { h: 40, s: 50, l: 80 } }, veg: 'cactus', snowline: 0 },
  snow:   { layers: [{ h: 215, s: 18, l: 78 }, { h: 212, s: 22, l: 70 }, { h: 210, s: 24, l: 62 }, { h: 208, s: 26, l: 54 }], floor: { h: 210, s: 15, l: 84 }, sky: { top: { h: 215, s: 35, l: 60 }, bottom: { h: 210, s: 25, l: 86 } }, veg: 'fir', snowline: 1 },
};
const mix = (a, b, k) => ({ h: lerp(a.h, b.h, k), s: lerp(a.s, b.s, k), l: lerp(a.l, b.l, k) });
export function biomePalette({ b, prev, k }) {
  const A = PAL[prev] || PAL[b], B = PAL[b];
  return {
    layers: B.layers.map((c, i) => mix(A.layers[i], c, k)), floor: mix(A.floor, B.floor, k),
    sky: { top: mix(A.sky.top, B.sky.top, k), bottom: mix(A.sky.bottom, B.sky.bottom, k) },
    veg: k < .5 ? A.veg : B.veg, snowline: lerp(A.snowline, B.snowline, k), b, prev, k,
  };
}
