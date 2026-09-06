import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeCtx } from './fakeCtx.js';
import { hudText, drawHud } from '../src/hud.js';

test('hudText : position et durée en timecode', () => {
  assert.equal(hudText(1421, 4817.2), '00:23:41 / 01:20:17');
  assert.equal(hudText(0, 60), '00:00:00 / 00:01:00');
});

test('drawHud écrit le timecode en bas à gauche, discret, avec un halo pour rester lisible', () => {
  const ctx = fakeCtx();
  drawHud(ctx, 1421, 4817.2, { W: 960, H: 600 }, .5);
  assert.deepEqual(ctx.texts(), ['00:23:41 / 01:20:17', '00:23:41 / 01:20:17'], 'halo puis texte');
  const [, , x, y] = ctx.calls.find(c => c[0] === 'fillText');
  assert.ok(x < 40 && y > 560, 'en bas à gauche');
  assert.ok(ctx.setValues('globalAlpha').some(a => a <= .6), 'discret');
});

test('drawHud ne dessine rien quand l’opacité est nulle', () => {
  const ctx = fakeCtx(); drawHud(ctx, 10, 100, { W: 960, H: 600 }, 0);
  assert.equal(ctx.texts().length, 0);
});
