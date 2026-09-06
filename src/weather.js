import { clamp, hash } from './util.js';

// Météo par segments de 3 minutes, tirée de façon reproductible : le défilement dans le morceau reste cohérent
export const WSEG = 180;
export const WEATHERS = ['clear', 'clear', 'cloudy', 'rain', 'storm', 'fog', 'snow', 'clear', 'aurora', 'cloudy', 'rain'];
export const WNAME = { clear: 'ciel clair', cloudy: 'nuageux', rain: 'pluie', storm: 'orage', fog: 'brouillard', snow: 'neige', aurora: 'aurore' };
export const WCOL = { clear: '#8a8f9c', cloudy: '#5c6270', rain: '#3d6fb0', storm: '#6a3fb5', fog: '#b9bcc9', snow: '#dbe6ff', aurora: '#1fbf8a' };
const DARK = { rain: .5, storm: .8, cloudy: .3, snow: .25 };

// Graine 5 : sur les 27 segments du set, chaque phénomène apparaît au moins une fois
export const pickW = seg => WEATHERS[Math.floor(hash(seg * 1.7 + 5) * WEATHERS.length)];

export function weatherAt(t) {
  const seg = Math.floor(t / WSEG), local = t - seg * WSEG;
  const w = pickW(seg), prev = pickW(seg - 1);
  const k = clamp(Math.min(local, WSEG - local) / 20, 0, 1);
  const rainbow = (prev === 'rain' || prev === 'storm') && local < 75 ? clamp(Math.min(local / 8, (75 - local) / 15), 0, 1) : 0;
  return { w, k, rainbow, dark: (DARK[w] || 0) * k };
}
