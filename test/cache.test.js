import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnalysisCache, cacheKey } from '../src/analysis-cache.js';
import { LiveAnalysis } from '../src/live-analysis.js';

// Faux stockage : l'interface de localStorage, avec un quota pour tester l'éviction
function fakeStorage(quota = Infinity) {
  const map = new Map();
  return {
    get length() { return map.size; }, key: i => [...map.keys()][i], getItem: k => map.has(k) ? map.get(k) : null,
    setItem(k, v) { const size = [...map.entries()].filter(([kk]) => kk !== k).reduce((a, [, vv]) => a + vv.length, 0) + v.length; if (size > quota) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } map.set(k, v); },
    removeItem: k => map.delete(k), _map: map,
  };
}
const fill = (l, n) => { for (let i = 0; i < n; i++) l.feed(i * .5, { loud: -30 + i, peak: -3, sub: .5, bass: .4, mid: .3, high: .2 }); };

test('cacheKey identifie une piste par son nom et sa durée arrondie, pas par son URL de session', () => {
  assert.equal(cacheKey({ name: 'Sacré cœur', src: 'blob:abc' }, 319.27), cacheKey({ name: 'Sacré cœur', src: 'http://x/y.wav' }, 319.4));
  assert.notEqual(cacheKey({ name: 'a' }, 100), cacheKey({ name: 'a' }, 200));
});

test('sauvegarde puis rechargement : la même analyse revient, avec son état complet ou partiel', () => {
  const st = fakeStorage(), cache = new AnalysisCache(st), l = new LiveAnalysis(.5); fill(l, 10);
  cache.save('k1', l, false);
  const back = cache.load('k1');
  assert.ok(back); assert.equal(back.complete, false); assert.equal(back.S.length, 10); assert.equal(back.step, .5);
  cache.save('k1', l, true); assert.equal(cache.load('k1').complete, true);
  assert.equal(cache.load('inconnu'), null);
});

test('LiveAnalysis.load repart d’une analyse en cache et continue après', () => {
  const st = fakeStorage(), cache = new AnalysisCache(st), l = new LiveAnalysis(.5); fill(l, 10); cache.save('k', l, false);
  const m = new LiveAnalysis(.5); m.load(cache.load('k'));
  assert.equal(m.S.length, 10); assert.equal(m.duration, 5);
  m.feed(5.1, { loud: -10, peak: -3, sub: .5, bass: .4, mid: .3, high: .2 });
  assert.equal(m.S.length, 11, 'la suite s’ajoute sans doublon');
  m.feed(2, { loud: -99, peak: -3, sub: .5, bass: .4, mid: .3, high: .2 });
  assert.equal(m.S[4], -26, 'revenir en arrière ne réécrit pas ce qui est connu');
});

test('les valeurs sont arrondies pour rester compactes, et l’éviction retire les plus anciennes quand le quota déborde', () => {
  const st = fakeStorage(1500), cache = new AnalysisCache(st, 'c.');
  for (let i = 0; i < 6; i++) { const l = new LiveAnalysis(.5); fill(l, 20); cache.save('k' + i, l, true); }
  assert.ok(st.length >= 1 && st.length < 6, 'quota : tout ne tient pas, mais les derniers sont là');
  assert.ok(cache.load('k5'), 'le plus récent est conservé');
  assert.equal(cache.load('k0'), null, 'le plus ancien a été évincé');
  const raw = st.getItem('c.k5'); assert.ok(!/\d\.\d{3,}/.test(raw), 'pas plus de deux décimales');
});
