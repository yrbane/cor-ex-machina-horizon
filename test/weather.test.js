import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weatherAt, WSEG, WEATHERS, pickW, WNAME, WCOL } from '../src/weather.js';

test('chaque phénomène a un nom et une couleur', () => {
  for (const w of new Set(WEATHERS)) { assert.ok(WNAME[w], w); assert.ok(WCOL[w], w); }
});

test('la météo est reproductible et constante à l’intérieur d’un segment', () => {
  assert.equal(pickW(3), pickW(3));
  assert.equal(weatherAt(3 * WSEG + 10).w, weatherAt(3 * WSEG + 100).w);
});

test('l’intensité monte en 20 s, plafonne à 1 et redescend avant la fin du segment', () => {
  assert.equal(weatherAt(0).k, 0);
  assert.equal(weatherAt(10).k, .5);
  assert.equal(weatherAt(90).k, 1);
  assert.equal(weatherAt(WSEG - 10).k, .5);
});

test('un arc-en-ciel ne suit qu’un segment de pluie ou d’orage, pendant 75 s au plus', () => {
  let found = false;
  for (let seg = 1; seg < 200; seg++) {
    const prev = pickW(seg - 1), wet = prev === 'rain' || prev === 'storm';
    const early = weatherAt(seg * WSEG + 20), late = weatherAt(seg * WSEG + 100);
    assert.equal(early.rainbow > 0, wet, `segment ${seg}`);
    assert.equal(late.rainbow, 0);
    if (wet) found = true;
  }
  assert.ok(found, 'au moins un arc-en-ciel possible');
});

test('sur les 27 segments du set, tous les phénomènes apparaissent', () => {
  const seen = new Set(); for (let seg = 0; seg < 27; seg++) seen.add(pickW(seg));
  for (const w of new Set(WEATHERS)) assert.ok(seen.has(w), `manque ${w}`);
});

test('l’assombrissement suit le phénomène', () => {
  const dark = w => { for (let seg = 0; seg < 400; seg++) if (pickW(seg) === w) return weatherAt(seg * WSEG + 90).dark; };
  assert.equal(dark('clear'), 0);
  assert.ok(dark('storm') > dark('rain') && dark('rain') > dark('cloudy') && dark('cloudy') > 0);
});
