import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skyState, PERIOD, bodyVisibility } from '../src/sky.js';

test('le soleil et la lune ne sont jamais levés en même temps', () => {
  for (let t = 0; t < PERIOD * 6; t += 1.7) {
    const s = skyState(t);
    assert.ok(!(s.sun.up && s.moon.up), `t=${t}`);
  }
});

test('à l’instant zéro aucun astre n’est levé, et le premier lever est celui du soleil', () => {
  assert.equal(skyState(0).sun.up, false);
  assert.equal(skyState(0).moon.up, false);
  assert.equal(skyState(5).sun.up, true);
  assert.equal(skyState(5).moon.up, false);
});

test('un astre levé a une altitude strictement positive, et il traverse le ciel de gauche à droite', () => {
  for (let t = 0; t < PERIOD * 3; t += 3) {
    const s = skyState(t);
    for (const b of [s.sun, s.moon]) if (b.up) assert.ok(b.alt > 0);
  }
  const a = skyState(PERIOD * .1).sun, b = skyState(PERIOD * .4).sun;
  assert.ok(a.up && b.up && b.x > a.x);
});

test('la trajectoire et la phase changent d’un cycle à l’autre', () => {
  const c0 = skyState(PERIOD * .25), c1 = skyState(PERIOD * 1.25);
  assert.notEqual(c0.sun.alt.toFixed(4), c1.sun.alt.toFixed(4));
  assert.notEqual(c0.phase, c1.phase);
});

test('jour à midi, nuit à minuit, crépuscule à la transition', () => {
  assert.equal(skyState(PERIOD * .25).day, 1);
  assert.equal(skyState(PERIOD * .75).day, 0);
  assert.ok(skyState(PERIOD * .5).dusk > .9);
});

test('bodyVisibility : part du disque au-dessus de l’horizon', () => {
  assert.equal(bodyVisibility({ y: 100, r: 10 }, 200), 1, 'entièrement au-dessus');
  assert.equal(bodyVisibility({ y: 300, r: 10 }, 200), 0, 'entièrement en dessous');
  assert.equal(bodyVisibility({ y: 200, r: 10 }, 200), .5, 'à cheval');
});
