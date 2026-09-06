import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeCtx, seeded } from './fakeCtx.js';
import { spawn } from '../src/events.js';
import { drawEvent } from '../src/draw/events.js';
import { drawBody } from '../src/draw/bodies.js';
import { layerValue, drawLayer, makeLayers } from '../src/draw/landscape.js';

const scene = { W: 960, H: 600, horizon: 444, wTop: 480, tn: 12.3, hue: 0, disp: { sub: .5, bass: .5, mid: .5, high: .5 } };
const day = { day: 1, dusk: 0, sun: { up: true }, moon: { up: false } }, night = { day: 0, dusk: 0, sun: { up: false }, moon: { up: true } };

test('chaque type de passage se dessine sans erreur, de jour et de nuit, dans les deux sens', () => {
  const rng = seeded(2);
  for (const k of ['bird', 'flock', 'airliner', 'prop', 'heli', 'balloon', 'zeppelin', 'paraglider', 'satellite', 'ufo', 'shooting', 'comet', 'balloons', 'kite', 'butterflies', 'bat', 'seeds', 'sailboat', 'ship', 'fish', 'whale']) {
    for (const dir of [1, -1]) for (const sky of [day, night]) {
      const e = spawn(k, rng, 0); e.dir = dir; e.x = .5; e.y = .3; e.life = .4; e.trail = [{ x: .4, y: .3, a: .5 }, { x: .5, y: .3, a: 1 }];
      const ctx = fakeCtx();
      drawEvent(ctx, e, scene, sky);
      assert.ok(ctx.calls.length > 3, `${k} dessine quelque chose`);
    }
  }
});

test('la banderole affiche EMT en texte, lisible quel que soit le sens', () => {
  const rng = seeded(3);
  const e = spawn('prop', rng, 0); e.banner = true; e.bannerText = 'EMT'; e.x = .5; e.y = .3;
  for (const dir of [1, -1]) {
    e.dir = dir; const ctx = fakeCtx(); drawEvent(ctx, e, scene, day);
    assert.ok(ctx.texts().includes('EMT'), `texte EMT dessiné (sens ${dir})`);
  }
});

test('l’avion de ligne est détaillé : hublots, deux réacteurs, ailettes, traînée le jour', () => {
  const rng = seeded(4);
  const e = spawn('airliner', rng, 0); e.x = .5; e.y = .1; e.trail = Array.from({ length: 10 }, (_, i) => ({ x: .3 + i * .02, y: .1, a: 1 - i * .05 }));
  const ctx = fakeCtx(); drawEvent(ctx, e, scene, day);
  assert.ok(ctx.count('fillRect') >= 8, 'au moins huit hublots');
  assert.ok(ctx.count('ellipse') >= 3, 'fuselage et réacteurs');
  assert.ok(ctx.count('stroke') >= 5, 'traînée tracée par segments');
});

test('l’ovni a des feux multicolores qui tournent, et un dôme', () => {
  const rng = seeded(9);
  const e = spawn('ufo', rng, 0); e.x = .5; e.y = .3;
  const ctx = fakeCtx(); drawEvent(ctx, e, scene, night);
  const hues = ctx.setValues('fillStyle').filter(v => typeof v === 'string' && v.startsWith('hsla('));
  assert.ok(hues.length >= 5, 'au moins cinq feux colorés');
  assert.ok(ctx.count('arc') >= 6, 'dôme et feux en arcs');
});

const layerFactory = () => { const made = []; const make = (w, h) => { const c = fakeCtx(); made.push(c); return { canvas: { width: w, height: h }, ctx: c }; }; make.made = made; return make; };

test('la lune dessine des mers et des cratères, et le soleil des taches en plein jour', () => {
  const ctx = fakeCtx(), make = layerFactory();
  drawBody(ctx, { kind: 'moon', x: 300, y: 200, r: 30, n: 2, alt: .2 }, night, .3, { dark: 0 }, 5, 0, make);
  const layer = make.made[0];
  assert.ok(layer, 'la lune passe par un calque');
  assert.ok(layer.count('createRadialGradient') >= 4, 'mers en dégradés');
  assert.ok(layer.count('arc') >= 12, 'cratères');
  assert.equal(ctx.count('drawImage'), 1, 'le calque est reporté sur la scène');
  const ctx2 = fakeCtx();
  drawBody(ctx2, { kind: 'sun', x: 300, y: 200, r: 40, n: 2, alt: .3 }, day, .3, { dark: 0 }, 5, 0, make);
  assert.ok(ctx2.count('ellipse') >= 4, 'taches solaires');
});

test('la partie sombre de la lune est effacée, pas peinte en noir : le ciel passe à travers, sans contour', () => {
  const crescent = { ...night, phase: .05 }, full = { ...night, phase: .5 };
  const make = layerFactory(); drawBody(fakeCtx(), { kind: 'moon', x: 300, y: 200, r: 30, n: 2, alt: .2 }, crescent, .3, { dark: 0 }, 5, 0, make);
  const layer = make.made[0];
  assert.ok(layer.setValues('globalCompositeOperation').includes('destination-out'), 'ombre par effacement');
  assert.ok(!layer.setValues('fillStyle').some(v => typeof v === 'string' && v.startsWith('rgba(8,10,20')), 'aucun disque noir');
  const idx = layer.calls.findIndex(c => c[0] === 'set:globalCompositeOperation' && c[1] === 'destination-out');
  assert.ok(layer.calls.slice(idx).filter(c => c[0] === 'fill').length >= 3, 'disque, terminateur adouci, et halo effacé côté ombre');
  const make2 = layerFactory(); drawBody(fakeCtx(), { kind: 'moon', x: 300, y: 200, r: 30, n: 2, alt: .2 }, full, .3, { dark: 0 }, 5, 0, make2);
  assert.ok(!make2.made[0].setValues('globalCompositeOperation').includes('destination-out'), 'pleine lune : rien à effacer');
});

test('un plan silencieux reste plat et invisible, sans trait lumineux : pas de reflet au démarrage', () => {
  const S = new Float32Array(200).fill(-40); for (let i = 100; i < 200; i++) S[i] = -25 + (i % 12);
  const layers = makeLayers(S, .5);
  const L = layers[3];
  assert.equal(layerValue(L, 10, .5), 0, 'silence : hauteur nulle');
  assert.ok(layerValue(L, 64, .5) > .5, 'son : le plan se dresse');
  const ctx = fakeCtx();
  drawLayer(ctx, L, 10, { ...scene, parX: 0 }, day, 3);
  assert.equal(ctx.count('stroke'), 0, 'aucun contour tracé quand tout est plat');
});
