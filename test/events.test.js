import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TYPES, SPECIES, spawn, canSpawn, tickEvents, WATER_TYPES, BEHIND_CLOUDS, MAX_EVENTS } from '../src/events.js';
import { seeded } from './fakeCtx.js';

const day = { day: 1, dusk: 0 }, night = { day: 0, dusk: 0 };
const clear = { w: 'clear', k: 1 }, storm = { w: 'storm', k: 1 };

test('chaque type a un taux, une étiquette, et les types d’eau sont connus', () => {
  for (const k in TYPES) { assert.ok(TYPES[k].rate > 0, k); assert.ok(TYPES[k].label, k); }
  for (const w of WATER_TYPES) assert.ok(TYPES[w], w);
});

test('les ovnis sortent de jour comme de nuit, plus souvent la nuit', () => {
  assert.ok(canSpawn('ufo', day, clear, []));
  assert.ok(canSpawn('ufo', night, clear, []));
  assert.ok(TYPES.ufo.rate > 1 / 600, 'assez fréquents pour être vus dans un set');
});

test('les passages de nuit seule et de jour seul respectent le ciel', () => {
  assert.equal(canSpawn('shooting', day, clear, []), false);
  assert.equal(canSpawn('shooting', night, clear, []), true);
  assert.equal(canSpawn('balloon', night, clear, []), false);
  assert.equal(canSpawn('balloon', day, clear, []), true);
});

test('le mauvais temps cloue au sol ce qui vole léger, et la comète est unique', () => {
  assert.equal(canSpawn('balloon', day, storm, []), false);
  assert.equal(canSpawn('kite', day, storm, []), false);
  assert.equal(canSpawn('airliner', day, storm, []), true);
  assert.equal(canSpawn('comet', night, clear, [{ type: 'comet' }]), false);
});

test('jamais plus de trois passages à la fois, jamais deux du même type', () => {
  assert.equal(MAX_EVENTS, 3);
  assert.equal(canSpawn('bird', day, clear, [{ type: 'bird' }]), false, 'un oiseau à la fois');
  assert.equal(canSpawn('bird', day, clear, [{ type: 'kite' }, { type: 'ship' }, { type: 'drone' }]), false, 'trois déjà présents');
  assert.equal(canSpawn('bird', day, clear, [{ type: 'kite' }, { type: 'ship' }]), true);
  const rng = seeded(5), list = [];
  for (let i = 0; i < 4000; i++) { tickEvents(list, .5, day, .005, clear, rng, i * .5); assert.ok(list.length <= 3, 'jamais plus de trois'); assert.equal(new Set(list.map(e => e.type)).size, list.length, 'types tous différents'); }
});

test('spawn crée un passage hors écran, avec ses paramètres, pour chaque type', () => {
  const rng = seeded(7);
  for (const k in TYPES) {
    const e = spawn(k, rng, 0);
    assert.equal(e.type, k);
    assert.ok(e.x <= -.1 || e.x >= 1.1 || ['shooting', 'fish', 'whale', 'fireworks', 'rocket', 'dolphins'].includes(k), `${k} entre par un bord, sauf ce qui surgit sur place`);
  }
  const bird = spawn('bird', rng, 0);
  assert.ok(SPECIES.includes(bird.sp));
  const flock = spawn('flock', rng, 0);
  assert.ok(flock.off.length >= 5);
});

test('l’avion à banderole porte le texte EMT', () => {
  const rng = seeded(3);
  let banner = null; for (let i = 0; i < 50 && !banner; i++) { const e = spawn('prop', rng, 0); if (e.banner) banner = e; }
  assert.ok(banner, 'un avion à banderole sur cinquante');
  assert.equal(banner.bannerText, 'EMT');
});

test('tickEvents fait avancer, garde une trajectoire propre aux oiseaux, et retire ce qui sort', () => {
  const rng = seeded(11);
  const a = spawn('bird', rng, 0), b = spawn('bird', rng, 0);
  a.dir = b.dir = 1; a.x = b.x = 0; a.y = b.y = .3; a.heading = .5; b.heading = -.5;
  const list = [a, b];
  for (let i = 0; i < 60; i++) tickEvents(list, 1 / 30, day, .005, clear, rng, i / 30);
  assert.ok(a.x > 0 && b.x > 0, 'ils avancent');
  assert.notEqual(a.y.toFixed(3), b.y.toFixed(3), 'deux caps différents : vols non parallèles');
  const gone = spawn('airliner', rng, 0); gone.x = 5;
  const l2 = [gone]; tickEvents(l2, .1, day, 0, clear, rng, 0);
  assert.equal(l2.length, 0);
});

test('tickEvents fait apparaître des passages avec un taux, jamais de nuit seule le jour', () => {
  const rng = seeded(5), list = [];
  for (let i = 0; i < 4000; i++) tickEvents(list, .5, day, .005, clear, rng, i * .5);
  assert.ok(list.length > 0, 'quelque chose est apparu');
  assert.ok(!list.some(e => TYPES[e.type].night), 'rien de nocturne en plein jour');
});

test('la comète, les étoiles filantes et les satellites passent derrière les nuages, pas les oiseaux ni les avions', () => {
  for (const k of ['comet', 'shooting', 'satellite']) assert.ok(BEHIND_CLOUDS.includes(k), k);
  for (const k of ['bird', 'airliner', 'ufo', 'balloon', 'fireworks']) assert.ok(!BEHIND_CLOUDS.includes(k), k);
  for (const k of BEHIND_CLOUDS) assert.ok(TYPES[k], k);
});

test('les nouveaux passages ont leurs règles : feux d’artifice de nuit, fusée rare, canards et dauphins sur l’eau', () => {
  assert.equal(canSpawn('fireworks', day, clear, []), false);
  assert.equal(canSpawn('fireworks', night, clear, []), true);
  assert.ok(TYPES.rocket.rate < 1 / 600, 'fusée rare');
  for (const k of ['ducks', 'dolphins', 'serpent', 'submarine']) assert.ok(WATER_TYPES.includes(k), k);
  assert.ok(Object.keys(TYPES).length >= 29, 'au moins 29 types de passages');
});

test('la fusée monte et disparaît en haut, les feux d’artifice s’éteignent d’eux-mêmes', () => {
  const rng = seeded(21);
  const r = spawn('rocket', rng, 0); r.x = .5; r.y = .7; const list = [r];
  const y0 = r.y; tickEvents(list, .5, night, 0, clear, rng, .5);
  assert.ok(r.y < y0, 'elle monte');
  for (let i = 0; i < 400 && list.includes(r); i++) tickEvents(list, .5, night, 0, clear, rng, i);
  assert.ok(!list.includes(r), 'partie par le haut');
  const f = spawn('fireworks', rng, 0); const l2 = [f];
  for (let i = 0; i < 10; i++) tickEvents(l2, .5, night, 0, clear, rng, i);
  assert.ok(!l2.includes(f), 'éteint');
});

test('tickEvents respecte la liste des types admis par la scène', () => {
  const rng = seeded(8), list = [], allowed = ['bird', 'airliner', 'ufo'];
  for (let i = 0; i < 4000; i++) tickEvents(list, .5, day, .005, clear, rng, i * .5, allowed);
  assert.ok(list.length > 0);
  assert.ok(list.every(e => allowed.includes(e.type)));
});
