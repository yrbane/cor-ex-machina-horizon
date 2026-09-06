import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveAnalysis } from '../src/live-analysis.js';
import { Analysis } from '../src/analysis.js';

const meta = { step: .5, duration: 1, cols: ['t', 'M', 'S', 'peak', 'sub', 'bass', 'mid', 'high', 'width'] };

test('LiveAnalysis offre la même interface que Analysis : step, duration, S, M, PK, bands, at, norm, bandsAt, levelAt', () => {
  const a = new Analysis({ rows: [[0, -20, -20, -5, 30, 30, 20, 0, 0], [.5, -18, -18, -4, 40, 35, 25, 5, 0]], meta }), l = new LiveAnalysis(.5);
  for (const k of ['step', 'duration', 'S', 'M', 'PK', 'bands', 'at', 'norm', 'bandsAt', 'levelAt']) { assert.ok(k in l, k); assert.ok(k in a, k); }
  assert.equal(typeof a.levelAt(0), 'number');
});

test('LiveAnalysis accumule un échantillon par pas de temps, jamais plus, et sa durée suit le morceau', () => {
  const l = new LiveAnalysis(.5);
  assert.equal(l.duration, 0);
  for (let i = 0; i < 60; i++) l.feed(i / 30, { loud: -20 + i * .1, peak: -3, sub: .5, bass: .4, mid: .3, high: .2 });
  assert.equal(l.S.length, 4, 'deux secondes à 0,5 s : quatre échantillons');
  assert.ok(l.duration >= 1.5 && l.duration <= 2.1);
  assert.equal(l.at(l.S, 99), l.S[l.S.length - 1], 'au-delà de la fin : la dernière valeur');
});

test('LiveAnalysis normalise ses bandes et son niveau sur ce qu’elle a entendu', () => {
  const l = new LiveAnalysis(.5);
  for (let i = 0; i < 40; i++) l.feed(i * .5, { loud: -40 + i, peak: -3, sub: i / 40, bass: .5, mid: .5, high: .5 });
  assert.ok(l.levelAt(0) < .2 && l.levelAt(19) > .8, 'le niveau va du bas au haut de ce qui a été joué');
  const b = l.bandsAt(19); assert.ok(b.sub > .8 && b.bass >= 0 && b.bass <= 1);
});

test('LiveAnalysis se remet à zéro pour un nouveau morceau', () => {
  const l = new LiveAnalysis(.5);
  l.feed(0, { loud: -20, peak: -3, sub: .5, bass: .5, mid: .5, high: .5 }); l.feed(.6, { loud: -20, peak: -3, sub: .5, bass: .5, mid: .5, high: .5 });
  l.reset(); assert.equal(l.S.length, 0); assert.equal(l.duration, 0);
});

test('un saut en avant dans le morceau garde l’alignement temporel des échantillons', () => {
  const l = new LiveAnalysis(.5);
  l.feed(0, { loud: -20, peak: -3, sub: .5, bass: .5, mid: .5, high: .5 });
  l.feed(10, { loud: -10, peak: -3, sub: .5, bass: .5, mid: .5, high: .5 });
  assert.equal(l.S.length, 21, 'vingt et un échantillons pour dix secondes');
  assert.equal(l.at(l.S, 10), -10);
});
