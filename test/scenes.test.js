import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeCtx, seeded } from './fakeCtx.js';
import { SCENES, nextSceneId, sceneById, allowedTypes } from '../src/scenes/registry.js';
import { CITY_BIOMES, cityBiomeAt, cityPalette, renderCity } from '../src/scenes/city.js';
import { SEA_BIOMES, seaBiomeAt, seaPalette, renderSea } from '../src/scenes/sea.js';
import { CITY_TYPES, SEA_TYPES } from '../src/events.js';
import { BIOMES, BSEG, biomeAt, biomePalette } from '../src/scenes/biome.js';
import { renderValley, valleyGeometry } from '../src/scenes/valley.js';
import { WATER_TYPES, TYPES, spawn } from '../src/events.js';
import { makeLayers } from '../src/draw/landscape.js';

test('quatre scènes au registre, l’horizon seul avec eau ; on passe de l’une à l’autre en boucle', () => {
  assert.deepEqual(SCENES.map(s => s.id), ['horizon', 'valley', 'city', 'sea']);
  assert.equal(sceneById('horizon').water, true);
  assert.ok(!sceneById('valley').water && !sceneById('city').water && !sceneById('sea').water);
  assert.equal(nextSceneId('horizon'), 'valley'); assert.equal(nextSceneId('sea'), 'horizon'); assert.equal(nextSceneId('inconnu'), 'horizon');
});

test('chaque scène a ses passages : eau pour l’horizon seul, trafic pour la ville, faune marine pour l’océan seul', () => {
  const v = allowedTypes('valley'), h = allowedTypes('horizon'), c = allowedTypes('city'), o = allowedTypes('sea');
  for (const w of WATER_TYPES) { assert.ok(!v.includes(w) && !c.includes(w) && !o.includes(w), w); assert.ok(h.includes(w), w); }
  for (const k of CITY_TYPES) { assert.ok(c.includes(k), k); assert.ok(!h.includes(k) && !v.includes(k) && !o.includes(k), k); }
  for (const k of SEA_TYPES) { assert.ok(o.includes(k), k); assert.ok(!h.includes(k) && !c.includes(k), k); }
  assert.ok(v.includes('bird') && c.includes('bird') && c.includes('airliner') && !o.includes('bird'), 'les oiseaux volent partout sauf sous l’eau');
  assert.ok(CITY_TYPES.length >= 6 && SEA_TYPES.length >= 8, 'assez de passages propres à chaque scène');
});

test('les biomes alternent par segments, jamais deux fois le même de suite, et tous apparaissent sur un set', () => {
  assert.deepEqual(BIOMES, ['green', 'desert', 'snow']);
  const seen = new Set(); let prev = null;
  for (let seg = 0; seg < 30; seg++) { const b = biomeAt(seg * BSEG + 10).b; assert.notEqual(b, prev, `segment ${seg}`); seen.add(b); prev = b; }
  assert.equal(seen.size, 3);
  assert.equal(biomeAt(5).b, biomeAt(BSEG - 5).b, 'constant dans un segment');
});

test('la transition entre biomes est douce : le facteur monte de 0 à 1 sur vingt secondes', () => {
  const a = biomeAt(BSEG + 0), m = biomeAt(BSEG + 10), z = biomeAt(BSEG + 60);
  assert.equal(a.k, 0); assert.equal(m.k, .5); assert.equal(z.k, 1);
  assert.notEqual(a.prev, a.b);
});

test('biomePalette mélange les couleurs pendant la transition et donne une végétation par biome', () => {
  const g = biomePalette({ b: 'green', prev: 'desert', k: 1 }), d = biomePalette({ b: 'desert', prev: 'green', k: 1 }), mid = biomePalette({ b: 'desert', prev: 'green', k: .5 });
  assert.equal(g.veg, 'pine'); assert.equal(d.veg, 'cactus'); assert.equal(biomePalette({ b: 'snow', prev: 'green', k: 1 }).veg, 'fir');
  assert.ok(Math.abs(mid.floor.h - (g.floor.h + d.floor.h) / 2) < 1e-9, 'teinte du sol interpolée');
  assert.ok(g.layers.length >= 4 && g.layers.every(c => 'h' in c && 's' in c && 'l' in c));
});

test('renderValley dessine ciel, plans, sol et végétation sans jamais tracer d’eau, et ignore les passages d’eau', () => {
  const S = new Float32Array(400); for (let i = 0; i < 400; i++) S[i] = -25 + (i % 12);
  const layers = makeLayers(S, .5), ctx = fakeCtx(), rng = seeded(3);
  const events = [spawn('bird', rng, 0), spawn('sailboat', rng, 0), spawn('ufo', rng, 0)]; events.forEach(e => { e.x = .5; e.y = .3; });
  const drawn = [];
  const H = { drawSky: () => { drawn.push('sky'); }, drawBodies: () => { drawn.push('bodies'); return { src: null, srcVis: 0 }; }, drawStreaks: () => { drawn.push('streaks'); }, drawClouds: () => { drawn.push('clouds'); },
    drawEvent: (c, e) => { drawn.push('event:' + e.type); }, drawLayer: (c, L, t, scene, sky, i) => { drawn.push('layer' + i); c.fill(); }, drawWater: () => { drawn.push('water'); }, drawRain: () => {}, drawSnow: () => {}, drawFog: () => {}, drawAurora: () => {}, drawRainbow: () => {} };
  const state = { W: 960, H: 600, t: 100, tn: 5, dt: .03, sky: { day: 1, dusk: 0, sun: { up: true }, moon: { up: false } }, wx: { w: 'clear', k: 1, dark: 0, rainbow: 0 }, disp: { sub: .5, bass: .5, mid: .5, high: .5 }, lvl: .5, hue: 0, layers, events, parX: 0, parY: 0, wind: .005, kickFlash: 0 };
  renderValley(ctx, state, H);
  assert.ok(drawn.includes('sky') && drawn.includes('clouds') && drawn.includes('layer3'), 'ciel, nuages et plans');
  assert.ok(!drawn.includes('water'), 'pas d’eau');
  assert.ok(drawn.includes('event:bird') && drawn.includes('event:ufo') && !drawn.includes('event:sailboat'), 'les passages d’eau sont ignorés');
  assert.ok(ctx.count('fill') >= 8, 'sol et végétation remplis');
  const g = valleyGeometry(600);
  assert.ok(g.floor > g.horizon && g.floor < 600, 'le sol de la vallée est sous l’horizon');
});

test('la ville et l’océan ont chacun trois biomes qui alternent sans répétition, avec leurs palettes', () => {
  assert.deepEqual(CITY_BIOMES, ['modern', 'old', 'neon']); assert.deepEqual(SEA_BIOMES, ['reef', 'kelp', 'abyss']);
  for (const at of [cityBiomeAt, seaBiomeAt]) { let prev = null; const seen = new Set(); for (let seg = 0; seg < 30; seg++) { const b = at(seg * 300 + 10).b; assert.notEqual(b, prev); seen.add(b); prev = b; } assert.equal(seen.size, 3); }
  assert.ok(cityPalette({ b: 'neon', prev: 'old', k: 1 }).neon === 1 && cityPalette({ b: 'old', prev: 'neon', k: 1 }).spires === 1);
  assert.equal(seaPalette({ b: 'kelp', prev: 'reef', k: 1 }).flora, 'kelp'); assert.ok(seaPalette({ b: 'abyss', prev: 'reef', k: 1 }).glow === 1);
});

test('renderCity dessine la ville : ciel, immeubles, route, et seulement les passages du ciel et de la rue', () => {
  const S = new Float32Array(400); for (let i = 0; i < 400; i++) S[i] = -25 + (i % 12);
  const layers = makeLayers(S, .5), ctx = fakeCtx(), rng = seeded(4), drawn = [];
  const events = [spawn('bird', rng, 0), spawn('car', rng, 0), spawn('sailboat', rng, 0), spawn('school', rng, 0)]; events.forEach(e => { e.x = .5; e.y = .3; });
  const H = { drawSky: () => drawn.push('sky'), drawBodies: () => ({ src: null, srcVis: 0 }), drawStreaks: () => {}, drawClouds: () => drawn.push('clouds'), drawEvent: (c, e) => drawn.push('event:' + e.type), drawLayer: () => {}, drawWater: () => drawn.push('water'), drawRain: () => {}, drawSnow: () => {}, drawFog: () => {}, drawAurora: () => {}, drawRainbow: () => {} };
  const state = { W: 960, H: 600, t: 100, tn: 5, dt: .03, sky: { day: 0, dusk: 0, sun: { up: false }, moon: { up: true } }, wx: { w: 'clear', k: 1, dark: 0, rainbow: 0 }, disp: { sub: .5, bass: .5, mid: .5, high: .5 }, lvl: .5, hue: 0, layers, events, parX: 0, parY: 0, wind: .005, kickFlash: 0 };
  const R = renderCity(ctx, state, H);
  assert.ok(drawn.includes('sky') && drawn.includes('clouds') && !drawn.includes('water'));
  assert.ok(drawn.includes('event:bird') && drawn.includes('event:car') && !drawn.includes('event:sailboat') && !drawn.includes('event:school'));
  assert.ok(ctx.count('fillRect') > 40, 'immeubles et fenêtres');
  assert.ok(R.wTop > R.horizon && typeof R.layerGeom === 'function');
});

test('renderSea dessine le fond des océans sans ciel ni nuages, avec ses seuls passages marins', () => {
  const S = new Float32Array(400); for (let i = 0; i < 400; i++) S[i] = -25 + (i % 12);
  const layers = makeLayers(S, .5), ctx = fakeCtx(), rng = seeded(6), drawn = [];
  const events = [spawn('school', rng, 0), spawn('shark', rng, 0), spawn('bird', rng, 0), spawn('car', rng, 0)]; events.forEach(e => { e.x = .5; e.y = .3; });
  const H = { drawSky: () => drawn.push('sky'), drawBodies: () => { drawn.push('bodies'); return { src: null, srcVis: 0 }; }, drawStreaks: () => {}, drawClouds: () => drawn.push('clouds'), drawEvent: (c, e) => drawn.push('event:' + e.type), drawLayer: (c) => { drawn.push('layer'); c.fill(); }, drawWater: () => drawn.push('water'), drawRain: () => {}, drawSnow: () => {}, drawFog: () => {}, drawAurora: () => {}, drawRainbow: () => {} };
  const state = { W: 960, H: 600, t: 100, tn: 5, dt: .03, sky: { day: 1, dusk: 0, sun: { up: true }, moon: { up: false } }, wx: { w: 'clear', k: 1, dark: 0, rainbow: 0 }, disp: { sub: .5, bass: .5, mid: .5, high: .5 }, lvl: .5, hue: 0, layers, events, parX: 0, parY: 0, wind: .005, kickFlash: 0 };
  const R = renderSea(ctx, state, H);
  assert.ok(!drawn.includes('sky') && !drawn.includes('clouds') && !drawn.includes('bodies') && !drawn.includes('water'));
  assert.equal(drawn.filter(d => d === 'layer').length, 4);
  assert.ok(drawn.includes('event:school') && drawn.includes('event:shark') && !drawn.includes('event:bird') && !drawn.includes('event:car'));
  assert.ok(ctx.count('createLinearGradient') >= 2, 'eau et rayons de lumière');
  assert.equal(R.src, null);
});
