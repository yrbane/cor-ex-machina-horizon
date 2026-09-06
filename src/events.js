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
  sailboat:    { rate: 1 / 190, label: 'voiliers', where: 'water' },
  ship:        { rate: 1 / 380, label: 'cargos', where: 'water' },
  fish:        { rate: 1 / 80,  label: 'poissons', where: 'water' },
  whale:       { rate: 1 / 650, label: 'baleines', single: true, where: 'water' },
  drone:       { rate: 1 / 260, label: 'drones' },
  jets:        { rate: 1 / 700, label: 'patrouilles de chasseurs', day: true },
  rocket:      { rate: 1 / 1200, label: 'fusées', single: true },
  fireworks:   { rate: 1 / 60,  label: 'feux d’artifice', night: true },
  ducks:       { rate: 1 / 240, label: 'familles de canards', day: true, where: 'water' },
  dolphins:    { rate: 1 / 200, label: 'dauphins', where: 'water' },
  serpent:     { rate: 1 / 900, label: 'serpents de mer', single: true, where: 'water' },
  submarine:   { rate: 1 / 800, label: 'périscopes', single: true, where: 'water' },
  // Ville : sur la route et le trottoir
  car:         { rate: 1 / 2,   label: 'voitures', where: 'city', crowd: 8 },
  bus:         { rate: 1 / 60,  label: 'bus', where: 'city' },
  truck:       { rate: 1 / 90,  label: 'camions', where: 'city' },
  bike:        { rate: 1 / 12,  label: 'vélos', where: 'city', crowd: 3 },
  walker:      { rate: 1 / 4,   label: 'passants', where: 'city', crowd: 7 },
  tram:        { rate: 1 / 240, label: 'tramways', where: 'city', single: true },
  // Fond des océans
  school:      { rate: 1 / 15,  label: 'bancs de poissons', where: 'sea' },
  fishes:      { rate: 1 / .8,  label: 'poissons de toutes sortes', where: 'sea', crowd: 20 },
  leviathan:   { rate: 1 / 700, label: 'baleines géantes', where: 'sea', single: true },
  shark:       { rate: 1 / 120, label: 'requins', where: 'sea', single: true },
  turtle:      { rate: 1 / 90,  label: 'tortues', where: 'sea' },
  jelly:       { rate: 1 / 40,  label: 'méduses', where: 'sea' },
  manta:       { rate: 1 / 200, label: 'raies manta', where: 'sea', single: true },
  diver:       { rate: 1 / 150, label: 'plongeurs', where: 'sea' },
  octopus:     { rate: 1 / 220, label: 'pieuvres', where: 'sea', single: true },
  angler:      { rate: 1 / 160, label: 'baudroies', where: 'sea', night: true },
  subhull:     { rate: 1 / 400, label: 'sous-marins', where: 'sea', single: true },
  seawhale:    { rate: 1 / 500, label: 'baleines au large', where: 'sea', single: true },
};
export const WATER_TYPES = Object.keys(TYPES).filter(k => TYPES[k].where === 'water');
export const CITY_TYPES = Object.keys(TYPES).filter(k => TYPES[k].where === 'city');
export const SEA_TYPES = Object.keys(TYPES).filter(k => TYPES[k].where === 'sea');
export const BEHIND_CLOUDS = ['comet', 'shooting', 'satellite']; // ciel profond : dessinés avant les nuages
export const TRANSIENT = ['shooting', 'fish', 'whale', 'fireworks', 'dolphins'];
export const MAX_EVENTS = 3;   // passages simultanés au plus
// La foule de la ville : voitures, vélos et passants ne comptent pas dans cette limite. Chacun a son plafond (crowd), la rue le sien, et personne ne se ressemble
export const MAX_CROWD = 14;
export const CROWD_TYPES = Object.keys(TYPES).filter(k => TYPES[k].crowd);
export const CAR_MODELS = ['sedan', 'hatch', 'van', 'pickup', 'sports', 'taxi', 'police', 'cabrio', 'limo', 'suv'];
export const CAR_COLORS = ['#e8402f', '#f2c230', '#f5f5f5', '#2f7fe8', '#1fbf8a', '#8e44ad', '#3a4152', '#ff8c42', '#7fd1ff', '#c0392b'];
export const WALKER_LOOKS = ['coat', 'dress', 'hoodie', 'suit', 'kid', 'elder', 'runner', 'hat'];
export const FISH_SPECIES = ['clown', 'tang', 'angel', 'puffer', 'seahorse', 'eel', 'lion', 'sword', 'tuna', 'butterfly', 'grouper', 'barracuda', 'sunfish', 'discus'];
export const FISH_COLORS = ['#ff8c42', '#2f7fe8', '#f2c230', '#8ff0d0', '#c9a0ff', '#e8402f', '#9ad0ff', '#1fbf8a', '#ffd27a', '#c8d3e0'];
const FISH_FIXED = { clown: '#ff8c42', tang: '#2f7fe8', butterfly: '#f2c230', tuna: '#3a4a66', barracuda: '#c8d3e0', sword: '#4a5a80' };
const FISH_SPEED = { seahorse: [.003, .006], puffer: [.01, .02], eel: [.015, .025], sunfish: [.008, .014], grouper: [.012, .02], tuna: [.06, .09], barracuda: [.05, .08], sword: [.07, .1] };
const FISH_SIZE = { sunfish: [1.8, 2.4], grouper: [1.5, 2], tuna: [1.2, 1.6], sword: [1.3, 1.7], barracuda: [1.1, 1.5], seahorse: [.7, 1], eel: [1, 1.4] };
export const WALKER_COLORS = ['#e8402f', '#2f7fe8', '#f2c230', '#8e44ad', '#f5f5f5', '#1fbf8a', '#ff8c42', '#22252f'];
// Choisit un couple (a, b) qui n'est porté par aucun des passages déjà présents ; à défaut, n'importe lequel
function distinctPair(rng, existing, keyA, keyB, A, B, ok = () => true) {
  const used = new Set(existing.map(e => e[keyA] + '/' + e[keyB])), free = [];
  for (const a of A) for (const b of B) if (ok(a, b) && !used.has(a + '/' + b)) free.push([a, b]);
  return free.length ? free[Math.floor(rng() * free.length)] : [pick(rng, A), pick(rng, B)];
}

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
  if (T.crowd) return events.filter(e => e.type === type).length < T.crowd && events.filter(e => TYPES[e.type].crowd).length < MAX_CROWD;   // la foule a ses propres limites, et se répète
  const others = events.filter(e => !TYPES[e.type].crowd);
  if (others.length >= MAX_EVENTS) return false;
  if (others.some(e => e.type === type)) return false;   // jamais deux passages du même type en même temps
  return true;
}
// Taux effectif : la nuit noire favorise le nocturne, le jour franc le diurne, les ovnis préfèrent la nuit
function effectiveRate(type, sky) {
  const T = TYPES[type], night = 1 - sky.day; let r = T.rate;
  if (T.night) r *= night * night; if (T.day) r *= sky.day; if (type === 'ufo') r *= .35 + night * .65;
  return r;
}

export function spawn(type, rng, tn, existing = []) {
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
    case 'drone': Object.assign(e, { y: rnd(rng, .3, .6), v: rnd(rng, .025, .045), size: rnd(rng, .8, 1.2) }); break;
    case 'jets': Object.assign(e, { y: rnd(rng, .08, .3), v: rnd(rng, .11, .15), size: rnd(rng, .9, 1.2), n: 3 }); break;
    case 'rocket': Object.assign(e, { x: rnd(rng, .2, .8), y: .98, v: rnd(rng, .035, .05), tilt: rnd(rng, -.15, .15), size: rnd(rng, .9, 1.3), smoke: [] }); break;
    case 'fireworks': Object.assign(e, { x: rnd(rng, .15, .85), y: rnd(rng, .08, .35), life: 0, ttl: rnd(rng, 2.6, 3.6), col: pick(rng, PALETTE), col2: pick(rng, PALETTE), n: 24 + Math.floor(rng() * 16) }); break;
    case 'ducks': Object.assign(e, { d: rnd(rng, .3, .8), v: rnd(rng, .004, .007), n: 3 + Math.floor(rng() * 3) }); break;
    case 'dolphins': Object.assign(e, { x: rnd(rng, .15, .85), d: rnd(rng, .15, .6), life: 0, ttl: 2.2, n: 1 + Math.floor(rng() * 2) }); break;
    case 'serpent': Object.assign(e, { d: rnd(rng, .1, .4), v: rnd(rng, .006, .01), size: rnd(rng, .9, 1.3) }); break;
    case 'submarine': Object.assign(e, { d: rnd(rng, .2, .6), v: rnd(rng, .004, .008) }); break;
    case 'car': { const [model, col] = distinctPair(rng, existing.filter(o => o.type === 'car'), 'model', 'col', CAR_MODELS, CAR_COLORS, (m, c) => (m !== 'taxi' || c === '#f2c230') && (m !== 'police' || c === '#f5f5f5')); Object.assign(e, { lane: dir > 0 ? 1 : 0, v: rnd(rng, .07, .13) * (model === 'sports' ? 1.4 : model === 'limo' ? .8 : 1), model, col, size: rnd(rng, .9, 1.1) }); break; }
    case 'bus': Object.assign(e, { lane: dir > 0 ? 1 : 0, v: rnd(rng, .05, .07), col: pick(rng, ['#1fbf8a', '#2f7fe8', '#f2c230']) }); break;
    case 'truck': Object.assign(e, { lane: dir > 0 ? 1 : 0, v: rnd(rng, .05, .08), col: pick(rng, ['#f5f5f5', '#e8402f', '#3a4152']) }); break;
    case 'bike': Object.assign(e, { lane: 2, v: rnd(rng, .03, .045), col: pick(rng, ['#e8402f', '#2f7fe8', '#f2c230']) }); break;
    case 'walker': { const [look, col] = distinctPair(rng, existing.filter(o => o.type === 'walker'), 'look', 'col', WALKER_LOOKS, WALKER_COLORS); Object.assign(e, { lane: 3, v: rnd(rng, .012, .02) * (look === 'runner' ? 2.2 : look === 'elder' ? .6 : 1), look, col, size: look === 'kid' ? rnd(rng, .6, .7) : rnd(rng, .9, 1.15), dog: look !== 'kid' && rng() < .2, umb: rng() < .7, skin: pick(rng, ['#e9c8a8', '#c68642', '#8d5524', '#f1d3b3']), hair: pick(rng, ['#22252f', '#5a3a1a', '#d9b56c', '#b0b4bf', '#a0302a']) }); break; }
    case 'tram': Object.assign(e, { lane: 0, v: rnd(rng, .05, .06), col: '#f2c230' }); break;
    case 'school': Object.assign(e, { y: rnd(rng, .15, .7), v: rnd(rng, .04, .07), n: 12 + Math.floor(rng() * 16), col: pick(rng, ['#9ad0ff', '#ffd27a', '#c9a0ff', '#8ff0d0']), size: rnd(rng, .8, 1.2) }); break;
    case 'shark': Object.assign(e, { y: rnd(rng, .2, .6), v: rnd(rng, .035, .05), size: rnd(rng, 1, 1.4) }); break;
    case 'turtle': Object.assign(e, { y: rnd(rng, .2, .7), v: rnd(rng, .015, .025), size: rnd(rng, .9, 1.2) }); break;
    case 'jelly': Object.assign(e, { x: rnd(rng, .1, .9), y: .95, v: 0, vy: rnd(rng, .012, .02), size: rnd(rng, .7, 1.3), col: pick(rng, ['#ff9ad5', '#9ad0ff', '#c9a0ff', '#8ff0d0']) }); break;
    case 'manta': Object.assign(e, { y: rnd(rng, .15, .5), v: rnd(rng, .025, .035), size: rnd(rng, 1.2, 1.6) }); break;
    case 'diver': Object.assign(e, { y: rnd(rng, .3, .7), v: rnd(rng, .012, .02), col: pick(rng, ['#f2c230', '#e8402f', '#2f7fe8']) }); break;
    case 'octopus': Object.assign(e, { y: rnd(rng, .5, .8), v: rnd(rng, .01, .018), size: rnd(rng, .9, 1.3) }); break;
    case 'angler': Object.assign(e, { y: rnd(rng, .4, .8), v: rnd(rng, .01, .02), size: rnd(rng, .9, 1.2) }); break;
    case 'subhull': Object.assign(e, { y: rnd(rng, .15, .45), v: rnd(rng, .02, .03), size: rnd(rng, 1.4, 1.8) }); break;
    case 'seawhale': Object.assign(e, { y: rnd(rng, .1, .35), v: rnd(rng, .012, .018), size: rnd(rng, 1.6, 2.2) }); break;
    case 'fishes': { const [species, col] = distinctPair(rng, existing.filter(o => o.type === 'fishes'), 'species', 'col', FISH_SPECIES, [...new Set([...FISH_COLORS, ...Object.values(FISH_FIXED)])], (sp, c) => !FISH_FIXED[sp] || FISH_FIXED[sp] === c); const sp = FISH_SPEED[species] || [.025, .05], sz = FISH_SIZE[species] || [.8, 1.3], low = species === 'seahorse' || species === 'eel' || species === 'grouper'; Object.assign(e, { species, col, v: rnd(rng, sp[0], sp[1]), size: rnd(rng, sz[0], sz[1]), y: low ? rnd(rng, .55, .8) : rnd(rng, .1, .7), shy: !FISH_SPEED[species] }); break; }
    case 'leviathan': Object.assign(e, { y: rnd(rng, .3, .5), v: rnd(rng, .012, .018), span: rnd(rng, .88, .98), margin: .7, x: dir > 0 ? -.65 : 1.65 }); break;
  }
  return e;
}

// Fait vivre la liste : apparitions, mouvements propres à chaque type, disparition hors champ
export function tickEvents(list, dt, sky, wind, weather, rng, tn, allowed = null) {
  for (const k in TYPES) if ((!allowed || allowed.includes(k)) && canSpawn(k, sky, weather, list) && rng() < effectiveRate(k, sky) * dt) list.push(spawn(k, rng, tn, list));
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
      case 'jelly': e.y -= e.vy * dt * (.7 + .3 * Math.sin(age * 2 + e.ph)); e.x += Math.sin(age * .8 + e.ph) * .01 * dt; break;
      case 'school': e.x += e.dir * e.v * dt; e.y += Math.sin(age * .7 + e.ph) * .03 * dt; if (rng() < dt / 6) e.dir *= -1; break;
      case 'diver': case 'turtle': case 'octopus': case 'angler': e.x += e.dir * e.v * dt; e.y += Math.sin(age * .9 + e.ph) * .02 * dt; break;
      case 'fishes': e.x += e.dir * e.v * dt; e.y = clamp(e.y + Math.sin(age * (e.species === 'seahorse' ? 1.5 : .8) + e.ph) * (e.species === 'seahorse' ? .04 : .02) * dt, .05, .85); if (e.shy && rng() < dt / 25) e.dir *= -1; break;   // les petits font demi-tour, les grands filent
      case 'drone': e.x += e.dir * e.v * dt; e.y += (Math.sin(age * 2.7 + e.ph) * .03 + Math.sin(age * 9) * .006) * dt; if (rng() < dt / 4) e.dir *= -1; break;
      case 'rocket': e.y -= e.v * dt; e.x += e.tilt * e.v * dt; if (tn - (e.lastSmoke || 0) > .12) { e.lastSmoke = tn; e.smoke.push({ x: e.x, y: e.y, a: 1 }); if (e.smoke.length > 24) e.smoke.shift(); } for (const p of e.smoke) p.a -= dt * .35; break;
      default: e.x += e.dir * e.v * dt;
    }
    const m = e.margin || .35; if (e.x < -m || e.x > 1 + m || e.y < -.15) list.splice(i, 1);   // la méduse sort par le haut, les autres par les côtés, la baleine géante a plus de marge
  }
}
