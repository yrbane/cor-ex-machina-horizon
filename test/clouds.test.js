import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeCtx } from './fakeCtx.js';
import { CloudSprites, cloudKey, makeCloud } from '../src/draw/clouds.js';
import { seeded } from './fakeCtx.js';

const light = { hue: 215, sat: 12, l: 88, a: .8 };

test('makeCloud produit un nuage avec profondeur, taille et plusieurs bourgeons', () => {
  const c = makeCloud(seeded(3));
  assert.ok(c.depth >= .3 && c.depth <= 1);
  assert.ok(c.parts.length >= 4);
  assert.ok(c.size > 0);
});

test('cloudKey quantifie la lumière : deux éclairages proches partagent un sprite, deux éloignés non', () => {
  assert.equal(cloudKey(light, 200), cloudKey({ ...light, l: 89 }, 200));
  assert.notEqual(cloudKey(light, 200), cloudKey({ ...light, l: 40 }, 200));
  assert.notEqual(cloudKey(light, 200), cloudKey(light, 260), 'la taille en pixels fait partie de la clé');
});

test('CloudSprites rend un nuage une fois par clé et le réutilise ensuite', () => {
  let made = 0;
  const factory = (w, h) => { made++; const ctx = fakeCtx(); return { canvas: { width: w, height: h }, ctx }; };
  const sprites = new CloudSprites(factory);
  const cloud = makeCloud(seeded(5));
  const a = sprites.get(cloud, light, 200), b = sprites.get(cloud, light, 200);
  assert.equal(made, 1); assert.equal(a, b);
  sprites.get(cloud, { ...light, l: 30 }, 200);
  assert.equal(made, 2, 'nouvel éclairage : nouveau rendu');
  assert.ok(a.ctx.count('createRadialGradient') >= cloud.parts.length, 'chaque bourgeon est modelé par un dégradé');
});
