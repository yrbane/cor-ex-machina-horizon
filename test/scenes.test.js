import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeCtx, seeded } from './fakeCtx.js';
import { SCENES, nextSceneId, sceneById, allowedTypes } from '../src/scenes/registry.js';
import { BIOMES, BSEG, biomeAt, biomePalette } from '../src/scenes/biome.js';
import { renderValley, valleyGeometry } from '../src/scenes/valley.js';
import { WATER_TYPES, TYPES, spawn } from '../src/events.js';
import { makeLayers } from '../src/draw/landscape.js';

test('deux scènes au registre, l’horizon avec eau, la vallée sans ; on passe de l’une à l’autre en boucle', () => {
  assert.deepEqual(SCENES.map(s => s.id), ['horizon', 'valley']);
  assert.equal(sceneById('horizon').water, true);
  assert.equal(sceneById('valley').water, false);
  assert.equal(nextSceneId('horizon'), 'valley'); assert.equal(nextSceneId('valley'), 'horizon'); assert.equal(nextSceneId('inconnu'), 'horizon');
});

test('la vallée n’accueille aucun passage d’eau, l’horizon les accueille tous', () => {
  const v = allowedTypes('valley'), h = allowedTypes('horizon');
  for (const w of WATER_TYPES) { assert.ok(!v.includes(w), w); assert.ok(h.includes(w), w); }
  assert.ok(v.includes('bird') && v.includes('airliner') && v.includes('ufo'));
  assert.equal(h.length, Object.keys(TYPES).length);
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
