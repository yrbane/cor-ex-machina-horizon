import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Playlist, parseDirectoryListing, isAudioUrl, trackName, iconFor, fmtDuration } from '../src/playlist.js';
import { seeded } from './fakeCtx.js';

test('isAudioUrl reconnaît les extensions audio, avec ou sans paramètres', () => {
  for (const u of ['a.mp3', 'http://x/y/z.flac?dl=1', 'set.M4A', 'file:///tmp/a.ogg', 'a.opus', 'b.wav', 'c.aac', 'd.webm']) assert.ok(isAudioUrl(u), u);
  for (const u of ['a.txt', 'http://x/', 'image.png', 'page.html']) assert.equal(isAudioUrl(u), false, u);
});

test('trackName déduit un nom lisible depuis une URL ou un chemin', () => {
  assert.equal(trackName('http://h/dossier/Mon%20morceau.mp3'), 'Mon morceau');
  assert.equal(trackName('EMT - la machine 260905 - master.mp3'), 'EMT - la machine 260905 - master');
});

test('parseDirectoryListing extrait les fichiers audio d’un index de dossier, en URL absolues, sans doublon', () => {
  const html = `<html><body><ul><li><a href="Sacr%C3%A9%20c%C5%93ur.wav">Sacré cœur.wav</a></li><li><a href="notes.txt">notes.txt</a></li>
    <li><a href="sub/">sub/</a></li><li><a href="/abs/piste.mp3">piste</a></li><li><a href="http://autre/x.flac">x</a></li><li><a href="Sacr%C3%A9%20c%C5%93ur.wav">encore</a></li></ul></body></html>`;
  const out = parseDirectoryListing(html, 'http://localhost:8080/musique/');
  assert.deepEqual(out, ['http://localhost:8080/musique/Sacr%C3%A9%20c%C5%93ur.wav', 'http://localhost:8080/abs/piste.mp3', 'http://autre/x.flac']);
});

test('Playlist : ajout, sélection, suivant et précédent en boucle, suppression', () => {
  const p = new Playlist();
  p.add({ name: 'set', src: 'set.mp3', isSet: true });
  p.add({ name: 'a', src: 'a.mp3' }); p.add({ name: 'b', src: 'b.mp3' });
  assert.equal(p.length, 3);
  assert.equal(p.current.name, 'set');
  assert.equal(p.next().name, 'a'); assert.equal(p.next().name, 'b'); assert.equal(p.next().name, 'set', 'en boucle');
  assert.equal(p.prev().name, 'b');
  p.select(1); assert.equal(p.current.name, 'a');
  p.remove(1); assert.equal(p.length, 2); assert.equal(p.current.name, 'b', 'la lecture passe à la suivante');
  p.remove(1); assert.equal(p.current.name, 'set');
  assert.equal(p.add({ name: 'set', src: 'set.mp3' }), false, 'pas de doublon de source');
});

test('Playlist ne persiste que les entrées qui survivent à un rechargement : pas les fichiers locaux', () => {
  const p = new Playlist();
  p.add({ name: 'set', src: 'set.mp3', isSet: true }); p.add({ name: 'local', src: 'blob:abc', local: true }); p.add({ name: 'web', src: 'http://h/x.mp3' });
  const json = p.toJSON();
  assert.deepEqual(json.map(t => t.name), ['web']);
  const q = new Playlist(); q.add({ name: 'set', src: 'set.mp3', isSet: true }); q.load(json);
  assert.deepEqual(q.tracks.map(t => t.name), ['set', 'web']);
});

test('move réordonne et suit la piste courante', () => {
  const p = new Playlist(); ['set', 'a', 'b', 'c'].forEach((n, i) => p.add({ name: n, src: n + '.mp3', isSet: i === 0 }));
  p.select(2); p.move(3, 1);
  assert.deepEqual(p.tracks.map(t => t.name), ['set', 'c', 'a', 'b']);
  assert.equal(p.current.name, 'b', 'la piste courante reste la même');
  p.move(0, 3); assert.equal(p.tracks[0].name, 'set', 'le set reste en tête');
});

test('shuffle mélange tout sauf le set, sans perdre la piste courante', () => {
  const p = new Playlist(); ['set', 'a', 'b', 'c', 'd', 'e'].forEach((n, i) => p.add({ name: n, src: n + '.mp3', isSet: i === 0 }));
  p.select(3); p.shuffle(seeded(9));
  assert.equal(p.tracks[0].name, 'set');
  assert.equal(p.current.name, 'c');
  assert.deepEqual([...p.tracks.map(t => t.name)].sort(), ['a', 'b', 'c', 'd', 'e', 'set']);
});

test('sans boucle, next s’arrête à la dernière piste', () => {
  const p = new Playlist(); p.add({ name: 'set', src: 's.mp3', isSet: true }); p.add({ name: 'a', src: 'a.mp3' });
  p.loop = false; p.select(1);
  assert.equal(p.next(), null, 'fin de liste');
  assert.equal(p.current.name, 'a');
  p.loop = true; assert.equal(p.next().name, 'set');
});

test('iconFor est stable et varié, fmtDuration lisible, totalDuration somme ce qui est connu', () => {
  assert.equal(iconFor('Sacré cœur'), iconFor('Sacré cœur'));
  assert.ok(new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(iconFor)).size >= 4, 'plusieurs icônes différentes');
  assert.equal(fmtDuration(65), '1 min 05');
  assert.equal(fmtDuration(4817), '1 h 20');
  assert.equal(fmtDuration(NaN), '');
  const p = new Playlist(); p.add({ name: 'a', src: 'a', duration: 60 }); p.add({ name: 'b', src: 'b' }); p.add({ name: 'c', src: 'c', duration: 30 });
  assert.equal(p.totalDuration(), 90);
});
