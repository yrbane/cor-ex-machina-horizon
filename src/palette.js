import { lerp } from './util.js';

// Teintes de base des quatre bandes (validées contre le fond nuit), décalées par la dérive de teinte du set
export const HUES = { sub: 18, bass: 158, mid: 40, high: 338 };
export const hsl = (hue, band, s, l, a = 1) => `hsla(${(HUES[band] + hue) % 360},${s}%,${l}%,${a})`;
export const rgba = (r, g, b, a) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;

// Encres des silhouettes : sombres le jour, claires la nuit
export function inks(day) {
  return {
    ink: rgba(lerp(234, 12, day), lerp(231, 14, day), lerp(221, 24, day), lerp(.55, .9, day)),
    white: rgba(lerp(205, 250, day), lerp(210, 250, day), lerp(225, 255, day), .96),
    shade: rgba(lerp(120, 165, day), lerp(125, 170, day), lerp(150, 190, day), .96),
    glass: 'rgba(40,60,90,.75)',
    lit: 'rgba(255,225,150,.9)',
  };
}
