import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Analysis, KickDetector, DataKick } from '../src/analysis.js';

const meta = { step: .5, duration: 2, cols: ['t', 'M', 'S', 'peak', 'sub', 'bass', 'mid', 'high', 'width'] };
const rows = [
  [0,   -20, -20, -5, 30, 30, 20, 0, -20],
  [.5,  -18, -18, -4, 40, 35, 25, 5, -20],
  [1,   -16, -16, -3, 50, 40, 30, 10, -20],
  [1.5, -14, -14, -2, 60, 45, 35, 15, -20],
];

test('Analysis expose les colonnes et interpole linéairement dans le temps', () => {
  const a = new Analysis({ rows, meta });
  assert.equal(a.duration, 2);
  assert.equal(a.at(a.S, 0), -20);
  assert.equal(a.at(a.S, .25), -19);
  assert.equal(a.at(a.S, 99), -14, 'au-delà de la fin on garde la dernière valeur');
  assert.equal(a.at(a.S, -5), -20, 'avant le début on garde la première');
});

test('Analysis normalise chaque bande entre ses percentiles 5 et 95', () => {
  const a = new Analysis({ rows, meta });
  assert.equal(a.norm('sub', a.range.sub[0]), 0);
  assert.equal(a.norm('sub', a.range.sub[1]), 1);
  assert.equal(a.norm('sub', 1e9), 1);
  assert.equal(a.norm('sub', -1e9), 0);
});

test('Analysis plafonne le silence à -40 LUFS pour le paysage', () => {
  const a = new Analysis({ rows: [[0, -70, -120, -60, 0, 0, 0, 0, 0]], meta: { ...meta, duration: .5 } });
  assert.equal(a.S[0], -40);
});

test('KickDetector déclenche sur une bouffée d’énergie basse et respecte le temps mort', () => {
  const k = new KickDetector();
  for (let i = 0; i < 200; i++) assert.equal(k.feed(1, i * .01), 0, 'régime stable : pas de coup');
  const hit = k.feed(6, 3);
  assert.ok(hit >= .25 && hit <= 1, 'un coup entre 0,25 et 1');
  assert.equal(k.feed(6, 3.1), 0, 'temps mort de 220 ms');
  assert.ok(k.feed(20, 3.5) > 0, 'nouveau coup après le temps mort');
  assert.equal(k.feed(0, 4), 0, 'énergie nulle : rien');
});

test('DataKick détecte une montée du sub entre deux échantillons précalculés', () => {
  const a = new Analysis({ rows, meta });
  const d = new DataKick(a);
  assert.equal(d.at(0), 0);
  assert.equal(d.at(0.1), 0, 'même échantillon : pas de nouveau coup');
  assert.ok(d.at(1.5) > 0, 'montée nette du sub');
});
