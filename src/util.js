// Utilitaires purs : bornes, interpolation, percentiles, hachage déterministe, lissage, formats français

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, f) => a + (b - a) * f;

// Percentile p (0…1) d'un tableau, valeurs non finies ignorées
export function pct(arr, p) {
  const s = [...arr].filter(Number.isFinite).sort((a, b) => a - b);
  return s[Math.floor(clamp(p, 0, 1) * (s.length - 1))];
}

// Hachage déterministe dans [0, 1) : sert à tirer des variations reproductibles (cycles, météo, cratères)
export function hash(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Moyenne glissante sur n échantillons, longueur conservée
export function smooth(arr, n) {
  if (n <= 1) return arr;
  const out = new Float32Array(arr.length); let acc = 0;
  for (let i = 0; i < arr.length; i++) { acc += arr[i]; if (i >= n) acc -= arr[i - n]; out[i] = acc / Math.min(n, i + 1); }
  return out;
}

// -30…-6 LUFS ramenés sur 0…1
export const LUF = v => clamp((v + 30) / 24, 0, 1);

export const fr = (x, d = 1) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(d).replace('.', ',');
export const tc = s => { s = Math.max(0, Math.floor(s)); return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
export const mmss = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const TAU = Math.PI * 2;
