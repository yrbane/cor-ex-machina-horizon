import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeCtx } from './fakeCtx.js';
import { RingWaveSource, EnvelopeWaveSource, WaveformStrip } from '../src/waveform.js';
import { drawWaveform } from '../src/draw/waveform.js';
import { Analysis } from '../src/analysis.js';

const meta = { step: .5, duration: 3, cols: ['t', 'M', 'S', 'peak', 'sub', 'bass', 'mid', 'high', 'width'] };
const rows = [[0, -20, -20, -30, 0, 0, 0, 0, 0], [.5, -18, -18, -20, 0, 0, 0, 0, 0], [1, -16, -16, -10, 0, 0, 0, 0, 0], [1.5, -14, -14, -3, 0, 0, 0, 0, 0], [2, -14, -14, -3, 0, 0, 0, 0, 0], [2.5, -14, -14, -3, 0, 0, 0, 0, 0]];

test('RingWaveSource : mémoire circulaire, les derniers échantillons dans l’ordre, zéros avant remplissage', () => {
  const s = new RingWaveSource(8, 4);            // 8 valeurs gardées, 4 par bloc poussé
  assert.deepEqual([...s.sample(4)], [0, 0, 0, 0], 'vide : silence');
  s.push(new Float32Array([.1, .2, .3, .4, .5, .6, .7, .8]));   // réduit à 4 valeurs, crêtes par paire
  assert.equal(s.sample(4).length, 4);
  assert.ok(s.sample(4)[3] >= .7, 'la dernière valeur est la crête du dernier groupe');
  s.push(new Float32Array([-.9, .1, .2, .1, .3, .1, .4, .1]));
  const last = s.sample(8);
  assert.equal(last.length, 8);
  assert.ok(Math.abs(last[4]) >= .8, 'la crête négative est conservée en signe');
  assert.equal(s.ready, true);
});

test('RingWaveSource ne déborde jamais et garde les plus récents', () => {
  const s = new RingWaveSource(6, 2);
  for (let i = 1; i <= 10; i++) s.push(new Float32Array([i / 10, i / 10, i / 10, i / 10]));
  const v = [...s.sample(6)];
  assert.equal(v.length, 6);
  assert.ok(v[5] >= v[0], 'les plus récents sont à la fin');
  assert.ok(v.every(x => x >= .8), 'seuls les derniers blocs restent');
});

test('EnvelopeWaveSource : signal signé modulé par les crêtes, qui défile avec le temps, nul hors du set', () => {
  const a = new Analysis({ rows, meta }), s = new EnvelopeWaveSource(a, 1);   // fenêtre d'une seconde
  const early = s.sample(80, .25), late = s.sample(80, 2.25), peak = v => Math.max(...v.map(Math.abs));
  assert.equal(early.length, 80);
  assert.ok(late.every(v => v >= -1 && v <= 1));
  assert.ok(late.some(v => v < 0) && late.some(v => v > 0), 'signal signé, pas une barre');
  assert.ok(peak(late) > peak(early) * 2, 'le set est plus fort à la fin');
  assert.notDeepEqual([...s.sample(80, 2.25)], [...s.sample(80, 2.26)], 'il défile');
  assert.ok(s.sample(10, -50).every(v => v === 0), 'hors du set : rien');
  assert.equal(s.ready, true);
});

test('drawWaveform trace une ligne pour un signal, une enveloppe miroir pour une enveloppe, rien pour le silence', () => {
  const box = { x: 100, y: 400, w: 300, h: 30 };
  const c1 = fakeCtx(); drawWaveform(c1, new Float32Array([0, .5, -.5, .2, -.1, 0]), box, { mode: 'signal', hue: 0 });
  assert.ok(c1.count('lineTo') >= 5 && c1.count('stroke') >= 1, 'polyligne tracée');
  const c2 = fakeCtx(); drawWaveform(c2, new Float32Array([.1, .5, .8, .5, .1]), box, { mode: 'envelope', hue: 0 });
  assert.ok(c2.count('fill') >= 1, 'enveloppe remplie');
  assert.ok(c2.count('lineTo') >= 9, 'aller au-dessus, retour en dessous');
  const c3 = fakeCtx(); drawWaveform(c3, new Float32Array(6), box, { mode: 'signal', hue: 0 });
  assert.equal(c3.count('stroke') + c3.count('fill'), 0, 'silence : rien');
});

test('WaveformStrip choisit le direct quand il est prêt, sinon l’enveloppe', () => {
  const calls = [];
  const live = { ready: false, sample: n => { calls.push('live'); return new Float32Array(n).fill(.3); } };
  const env = { ready: true, sample: (n, t) => { calls.push('env:' + t); return new Float32Array(n).fill(.2); } };
  const strip = new WaveformStrip(live, env, 6);
  strip.render(fakeCtx(), { x: 0, y: 0, w: 60, h: 10 }, 12, 0);
  assert.deepEqual(calls, ['env:12']);
  live.ready = true; calls.length = 0;
  strip.render(fakeCtx(), { x: 0, y: 0, w: 60, h: 10 }, 12, 0);
  assert.deepEqual(calls, ['live']);
});
