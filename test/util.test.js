import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, lerp, pct, hash, smooth, LUF, fr, tc, mmss } from '../src/util.js';

test('clamp borne dans les deux sens', () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(clamp(.5, 0, 1), .5);
});

test('lerp interpole linéairement', () => {
  assert.equal(lerp(0, 10, .25), 2.5);
  assert.equal(lerp(10, 0, 1), 0);
});

test('pct renvoie le percentile en ignorant les valeurs non finies', () => {
  assert.equal(pct([3, 1, 2, NaN, Infinity], 0), 1);
  assert.equal(pct([3, 1, 2], 1), 3);
  assert.equal(pct([3, 1, 2], .5), 2);
});

test('hash est déterministe et dans [0, 1)', () => {
  assert.equal(hash(42), hash(42));
  assert.notEqual(hash(42), hash(43));
  for (let i = 0; i < 200; i++) { const h = hash(i * 1.37); assert.ok(h >= 0 && h < 1); }
});

test('smooth lisse par moyenne glissante et conserve la longueur', () => {
  const out = smooth([0, 0, 10, 0, 0], 2);
  assert.equal(out.length, 5);
  assert.equal(out[2], 5);
  assert.equal(out[3], 5);
  assert.deepEqual([...smooth([1, 2, 3], 1)], [1, 2, 3]);
});

test('LUF ramène -30…-6 LUFS sur 0…1', () => {
  assert.equal(LUF(-30), 0);
  assert.equal(LUF(-6), 1);
  assert.equal(LUF(-18), .5);
  assert.equal(LUF(-50), 0);
});

test('formats français : virgule décimale, signe moins typographique, timecodes', () => {
  assert.equal(fr(-14.04), '−14,0');
  assert.equal(fr(3.456, 2), '3,46');
  assert.equal(tc(3725), '01:02:05');
  assert.equal(tc(-3), '00:00:00');
  assert.equal(mmss(605), '10:05');
});
