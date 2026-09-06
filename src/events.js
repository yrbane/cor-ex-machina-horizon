import { clamp, TAU } from './util.js';

// Passages du ciel et de l'eau : taux par seconde, heures, étiquettes pour la console
export const TYPES = {
  bird:        { rate: 1 / 28,  label: 'oiseaux' },
  flock:       { rate: 1 / 110, label: 'vols en V' },
  airliner:    { rate: 1 / 210, label: 'avions de ligne' },
  prop:        { rate: 1 / 240, label: 'avions à hélice' },
  heli:        { rate: 1 / 380, label: 'hélicoptères' },
  balloon:     { rate: 1 / 360, label: 'montgolfières', day: true, light: true },
  zeppelin:    { rate: 1 / 800, label: 'zeppelins' },
  paraglider:  { rate: 1 / 420, label: 'parapentes', day: true, light: true },
  satellite:   { rate: 1 / 200, label: 'satellites', night: true },
  ufo:         { rate: 1 / 300, label: 'ovnis' },
  shooting:    { rate: 1 / 40,  label: 'étoiles filantes', night: true },
  comet:       { rate: 1 / 480, label: 'comètes', night: true, single: true },
  balloons:    { rate: 1 / 600, label: 'ballons', day: true, light: true },
  kite:        { rate: 1 / 520, label: 'cerfs-volants', day: true, light: true },
  butterflies: { rate: 1 / 180, label: 'papillons', day: true, light: true },
  bat:         { rate: 1 / 130, label: 'chauves-souris', night: true },
  seeds:       { rate: 1 / 220, label: 'graines au vent', day: true },
  sailboat:    { rate: 1 / 190, label: 'voiliers' },
  ship:        { rate: 1 / 380, label: 'cargos' },
  fish:        { rate: 1 / 80,  label: 'poissons' },
  whale:       { rate: 1 / 650, label: 'baleines', single: true },
};
export const WATER_TYPES = ['sailboat', 'ship', 'fish', 'whale'];
export const TRANSIENT = ['shooting', 'fish', 'whale'];

// Espèces d'oiseaux : taille, cadence de battement, vitesse, ondulation, vol plané
export const SPECIES = [
  { name: 'martinet', size: .55, flap: 15, v: [.09, .13], wob: 3, dark: true },
  { name: 'mouette', size: 1, flap: 6, v: [.05, .08], wob: 1.2 },
  { name: 'corneille', size: 1.1, flap: 8, v: [.055, .075], wob: .8, dark: true },
  { name: 'rapace', size: 1.7, flap: 1.6, v: [.025, .04], wob: .4, glide: true },
];
const PALETTE = ['#e8402f', '#f2c230', '#f5f5f5', '#2f7fe8', '#1fbf8a', '#8e44ad'];
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const rnd = (rng, a, b) => a + rng() * (b - a);

// Un type peut-il apparaître maintenant ? Heures, météo, unicité
export function canSpawn(type, sky, weather, events) {
  const T = TYPES[type]; if (!T) return false;
  const night = 1 - sky.day;
  if (T.night && night < .5) return false;
  if (T.day && sky.day < .5) return false;
  if (T.light && (weather.w === 'rain' || weather.w === 'storm')) return false;
  if (T.single && events.some(e => e.type === type)) return false;
  return true;
}
// Taux effectif : la nuit noire favorise le nocturne, le jour franc le diurne, les ovnis préfèrent la nuit
function effectiveRate(type, sky) {
  const T = TYPES[type], night = 1 - sky.day; let r = T.rate;
  if (T.night) r *= night * night; if (T.day) r *= sky.day; if (type === 'ufo') r *= .35 + night * .65;
  return r;
}

export function spawn(type, rng, tn) {
  const dir = rng() < .5 ? 1 : -1, x0 = dir > 0 ? -.12 : 1.12, e = { type, dir, x: x0, born: tn, ph: rng() * TAU, seed: rng() };
  switch (type) {
    case 'bird': { const sp = pick(rng, SPECIES); Object.assign(e, { sp, y: rnd(rng, .12, .55), v: rnd(rng, sp.v[0], sp.v[1]), size: sp.size * rnd(rng, .8, 1.2), wob: sp.wob, heading: rnd(rng, -.3, .3), turn: rnd(rng, -.2, .2), swoop: 0 }); break; }
    case 'flock': { const sp = SPECIES[1 + Math.floor(rng() * 3)], n = 5 + Math.floor(rng() * 7), off = []; for (let i = 0; i < n; i++) { const k = Math.ceil(i / 2), side = i % 2 ? 1 : -1; off.push({ dx: -k * .02, dy: side * k * .012, ph: rng() * TAU, sp: rnd(rng, .85, 1.15), size: rnd(rng, .8, 1.2) }); } Object.assign(e, { sp, y: rnd(rng, .15, .45), v: rnd(rng, sp.v[0], sp.v[1]) * .9, off, size: sp.size, heading: rnd(rng, -.15, .15) }); break; }
    case 'airliner': Object.assign(e, { y: rnd(rng, .05, .2), v: rnd(rng, .035, .05), size: rnd(rng, 1.6, 2.4), livery: pick(rng, ['#2f7fe8', '#e8402f', '#1fbf8a', '#8e44ad']), trail: [] }); break;
    case 'prop': { const banner = rng() < .5; Object.assign(e, { y: rnd(rng, .15, .4), v: rnd(rng, .03, .045), size: rnd(rng, 1.1, 1.5), col: pick(rng, ['#e8402f', '#f2c230', '#f5f5f5', '#2f7fe8']), banner, bannerText: banner ? 'EMT' : '' }); break; }
    case 'heli': Object.assign(e, { y: rnd(rng, .2, .45), v: rnd(rng, .02, .035), size: rnd(rng, 1.1, 1.4), col: pick(rng, ['#f5f5f5', '#e8402f', '#f2c230']) }); break;
    case 'balloon': Object.assign(e, { y: rnd(rng, .15, .45), v: rnd(rng, .006, .012), size: rnd(rng, 1.1, 1.9), cols: pick(rng, [['#e8402f', '#f2c230'], ['#2f7fe8', '#f5f5f5'], ['#8e44ad', '#f2c230'], ['#1fbf8a', '#f5f5f5']]) }); break;
    case 'zeppelin': Object.assign(e, { y: rnd(rng, .1, .3), v: rnd(rng, .008, .014), size: rnd(rng, 1.8, 2.6) }); break;
    case 'paraglider': Object.assign(e, { y: rnd(rng, .2, .45), v: rnd(rng, .012, .02), size: rnd(rng, 1.1, 1.5), col: pick(rng, PALETTE) }); break;
    case 'satellite': Object.assign(e, { y: rnd(rng, .03, .25), v: rnd(rng, .02, .03), dy: rnd(rng, -.01, .01) }); break;
    case 'ufo': Object.assign(e, { y: rnd(rng, .1, .4), v: rnd(rng, .03, .06), size: rnd(rng, .9, 1.4), dart: 0, dy: 0 }); break;
    case 'shooting': { const a = .3 + rng() * .6; Object.assign(e, { x: rnd(rng, .1, .9), y: rnd(rng, 0, .3), dx: Math.cos(a) * dir, dy: Math.sin(a), life: 0, ttl: rnd(rng, .5, .9) }); break; }
    case 'comet': Object.assign(e, { y: rnd(rng, .04, .24), v: rnd(rng, .012, .022), dy: rnd(rng, -.0015, .003) }); break;
    case 'balloons': Object.assign(e, { y: rnd(rng, .6, .8), v: rnd(rng, .008, .015), dy: -rnd(rng, .012, .02), size: rnd(rng, .8, 1.2), n: 4 + Math.floor(rng() * 4) }); break;
    case 'kite': Object.assign(e, { y: rnd(rng, .3, .55), v: rnd(rng, .015, .025), size: rnd(rng, 1.1, 1.6), col: pick(rng, PALETTE), col2: pick(rng, PALETTE) }); break;
    case 'butterflies': Object.assign(e, { y: rnd(rng, .4, .62), v: rnd(rng, .015, .03), n: 2 + Math.floor(rng() * 4), col: pick(rng, ['#f2c230', '#e8402f', '#f5f5f5', '#2f7fe8']) }); break;
    case 'bat': Object.assign(e, { y: rnd(rng, .25, .55), v: rnd(rng, .05, .08), size: rnd(rng, .7, 1) }); break;
    case 'seeds': Object.assign(e, { y: rnd(rng, .3, .65), v: rnd(rng, .01, .02), n: 8 + Math.floor(rng() * 8) }); break;
    case 'sailboat': Object.assign(e, { d: rnd(rng, .05, .6), v: rnd(rng, .004, .009), col: pick(rng, ['#2a3140', '#8a2f2f', '#1f4d3a', '#f4f4f6']) }); break;
    case 'ship': Object.assign(e, { d: rnd(rng, 0, .08), v: rnd(rng, .0025, .004) }); break;
    case 'fish': Object.assign(e, { x: rnd(rng, .1, .9), d: rnd(rng, .15, .8), life: 0, ttl: .9 }); break;
    case 'whale': Object.assign(e, { x: rnd(rng, .15, .85), d: rnd(rng, .05, .35), life: 0, ttl: 7 }); break;
  }
  return e;
}

// Fait vivre la liste : apparitions, mouvements propres à chaque type, disparition hors champ
export function tickEvents(list, dt, sky, wind, weather, rng, tn) {
  for (const k in TYPES) if (canSpawn(k, sky, weather, list) && rng() < effectiveRate(k, sky) * dt) list.push(spawn(k, rng, tn));
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i], age = tn - e.born;
    if (TRANSIENT.includes(e.type)) { e.life += dt; if (e.life > e.ttl) list.splice(i, 1); continue; }
    switch (e.type) {
      case 'bird': // cap qui dérive, ondulation, piqués occasionnels : deux oiseaux n'ont jamais la même route
        e.turn = clamp(e.turn + (rng() - .5) * 1.2 * dt, -.5, .5); e.heading = clamp(e.heading + e.turn * dt, -.6, .6);
        if (e.swoop <= 0 && rng() < dt / 9) e.swoop = 1.2; if (e.swoop > 0) e.swoop -= dt;
        e.x += e.dir * e.v * dt * (e.swoop > 0 ? 1.5 : 1); e.y = clamp(e.y + (e.heading * .05 + (e.swoop > 0 ? Math.sin(e.swoop * 2.6) * .12 : 0)) * dt, .05, .62); break;
      case 'flock': // formation vivante : la route ondule, chacun flotte autour de sa place
        e.heading = clamp(e.heading + (rng() - .5) * .6 * dt, -.25, .25); e.x += e.dir * e.v * dt; e.y = clamp(e.y + e.heading * .04 * dt, .08, .55);
        for (const o of e.off) { o.dx += Math.sin(tn * .7 + o.ph) * .009 * dt; o.dy += Math.cos(tn * .5 + o.ph) * .006 * dt; } break;
      case 'airliner': e.x += e.dir * e.v * dt; if (sky.day > .25) { e.trail.push({ x: e.x, y: e.y, a: 1 }); if (e.trail.length > 70) e.trail.shift(); for (const p of e.trail) p.a -= dt * .04; } break;
      case 'balloon': case 'zeppelin': case 'balloons': case 'seeds': e.x += (e.dir * e.v - wind * 1.5) * dt; e.y += (e.dy || 0) * dt + Math.sin(age * .5 + e.ph) * .004 * dt; break;
      case 'satellite': case 'comet': e.x += e.dir * e.v * dt; e.y += e.dy * dt; break;
      case 'ufo': // vol stationnaire ondulant, puis bonds brusques
        if (e.dart <= 0 && rng() < dt / 3) { e.dart = .4; e.dy = (rng() - .5) * .5; }
        if (e.dart > 0) { e.dart -= dt; e.x += e.dir * e.v * 6 * dt; e.y += e.dy * dt; } else e.y += Math.sin(age * 3) * .01 * dt;
        e.x += e.dir * e.v * dt * .3; e.y = clamp(e.y, .05, .5); break;
      case 'bat': e.x += e.dir * e.v * dt * (.6 + Math.abs(Math.sin(age * 4))); e.y = clamp(e.y + Math.sin(age * 7 + e.ph) * .15 * dt + Math.cos(age * 2.3) * .05 * dt, .1, .6); break;
      case 'butterflies': e.x += e.dir * e.v * dt; e.y += Math.sin(age * 2 + e.ph) * .02 * dt; break;
      default: e.x += e.dir * e.v * dt;
    }
    if (e.x < -.35 || e.x > 1.35 || e.y < -.15) list.splice(i, 1);
  }
}
