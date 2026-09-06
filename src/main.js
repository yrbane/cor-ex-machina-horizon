import { clamp, lerp, TAU, tc } from './util.js';
import { hsl } from './palette.js';
import { Analysis, KickDetector, DataKick, BANDS } from './analysis.js';
import { skyState } from './sky.js';
import { weatherAt } from './weather.js';
import { tickEvents, WATER_TYPES, spawn } from './events.js';
import { makeLayers, drawLayer, timeAt } from './draw/landscape.js';
import { drawEvent } from './draw/events.js';
import { drawRain, drawSnow, drawFog, drawAurora, drawRainbow, Lightning } from './draw/weather.js';
import { drawWater } from './draw/water.js';
import { Console } from './draw/console.js';
import { RingWaveSource, EnvelopeWaveSource, WaveformStrip } from './waveform.js';
import { CloudSprites, makeCloud } from './draw/clouds.js';
import { drawHud } from './hud.js';
import { LiveAnalysis } from './live-analysis.js';
import { Playlist, trackName } from './playlist.js';
import { PlaylistPanel } from './playlist-panel.js';
import { ControlsBar } from './controls.js';
import { AnalysisCache, cacheKey } from './analysis-cache.js';
import { SCENES, sceneById, nextSceneId, allowedTypes } from './scenes/registry.js';
import { drawSky, drawBodies, drawStreaks, drawClouds } from './scenes/sky.js';
import { renderHorizon } from './scenes/horizon.js';
import { renderValley } from './scenes/valley.js';
import { renderCity } from './scenes/city.js';
import { renderSea, seaBiomeAt } from './scenes/sea.js';
import { cityBiomeAt } from './scenes/city.js';

// Câblage de la page : audio, analyse, boucle de rendu, scènes, interactions, panneaux
defineControls();   // Web Components de potard
const DATA = JSON.parse(document.getElementById('data').textContent);
const SET = new Analysis(DATA), LIVE = new LiveAnalysis(.5); let A = SET;   // A : analyse de la piste courante
const dur = () => (isFinite(audio.duration) && audio.duration > 0) ? audio.duration : (A === SET ? SET.duration : Math.max(LIVE.duration, 1));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const now = () => performance.now() / 1000;
const rng = Math.random;
const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } } };

// --- audio et analyse temps réel
const audio = document.getElementById('audio');
let audioFailed = false, actx = null, analyser = null, freq = null, silentSince = 0, live = false;
const HZ = { sub: [20, 60], bass: [60, 250], mid: [250, 2000], high: [2000, 16000] };
const range = Object.fromEntries(BANDS.map(b => [b, { lo: -70, hi: -30 }]));
const NSPEC = 48, spec = new Float32Array(NSPEC), specRange = { lo: -80, hi: -30 };
function startAnalyser() {
  if (actx) { actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const src = actx.createMediaElementSource(audio);
    analyser = actx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = .35;
    src.connect(analyser); analyser.connect(actx.destination);
    freq = new Float32Array(analyser.frequencyBinCount); silentSince = now();
  } catch (e) { actx = null; }
}
const liveWave = new RingWaveSource(900, 30), timeBuf = new Float32Array(2048);
function analyse() {
  if (!analyser) return null;
  analyser.getFloatFrequencyData(freq);
  const res = actx.sampleRate / analyser.fftSize, out = {}; let finite = false;
  for (const b of BANDS) {
    const [lo, hi] = HZ[b]; let sum = 0, n = 0;
    for (let i = Math.max(1, Math.floor(lo / res)); i < Math.min(freq.length, Math.ceil(hi / res)); i++) if (Number.isFinite(freq[i])) { sum += freq[i]; n++; finite = true; }
    const v = n ? sum / n : -120, r = range[b];
    r.hi = Math.max(v, r.hi - .03); r.lo = Math.min(v, r.lo + .03); if (r.hi - r.lo < 14) r.hi = r.lo + 14;
    out[b] = clamp((v - r.lo) / (r.hi - r.lo), 0, 1);
  }
  let e = 0, tot = 0; for (let i = Math.floor(30 / res); i < Math.ceil(150 / res); i++) if (Number.isFinite(freq[i])) e += Math.pow(10, freq[i] / 10);
  for (let i = Math.floor(40 / res); i < Math.min(freq.length, Math.ceil(12000 / res)); i++) if (Number.isFinite(freq[i])) tot += Math.pow(10, freq[i] / 10);
  out.kickE = e; out.loud = tot > 0 ? 10 * Math.log10(tot) : -90;
  if (finite) {
    silentSince = now(); let lo = 40;
    analyser.getFloatTimeDomainData(timeBuf); liveWave.push(timeBuf);
    let pk = 0; for (let i = 0; i < timeBuf.length; i++) pk = Math.max(pk, Math.abs(timeBuf[i])); out.peak = 20 * Math.log10(pk + 1e-6);
    for (let i = 0; i < NSPEC; i++) { const hi = 40 * Math.pow(300, (i + 1) / NSPEC); let s = 0, n = 0; for (let j = Math.max(1, Math.floor(lo / res)); j <= Math.max(Math.floor(lo / res) + 1, Math.floor(hi / res)); j++) if (j < freq.length && Number.isFinite(freq[j])) { s += freq[j]; n++; } const v = n ? s / n : -120; specRange.hi = Math.max(v, specRange.hi - .02); specRange.lo = Math.min(v, specRange.lo + .02); spec[i] = clamp((v - specRange.lo) / Math.max(20, specRange.hi - specRange.lo), 0, 1); lo = hi; }
  }
  live = finite || now() - silentSince < 1.5;
  return live ? out : null;
}
const kickDet = new KickDetector(); let dataKick = new DataKick(A);
const waveStrip = new WaveformStrip(liveWave, new EnvelopeWaveSource(A, 3), 240);

// --- rendu : 30 images/s maxi, résolution plafonnée et adaptée à la machine
const cv = document.getElementById('c'), ctx = cv.getContext('2d', { alpha: false, desynchronized: true });
const back = document.createElement('canvas'), bctx = back.getContext('2d');
const moonLayer = document.createElement('canvas');
const makeLayer = (w, h) => { if (moonLayer.width !== w || moonLayer.height !== h) { moonLayer.width = w; moonLayer.height = h; } const c = moonLayer.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, w, h); return { canvas: moonLayer, ctx: c }; };
let W = 0, H = 0, Q = 1, lastDraw = 0, workAcc = 0, workN = 0, workT0 = now(), calmSince = now();
const FPS_CAP = 30;
const stats = { fpsHist: [], fps: 0, work: 0, kicks: 0, spawned: {}, bandHist: [], frames: 0 };
function adapt(work) {
  workAcc += work; workN++; stats.frames++; window.__drawn = stats.frames;
  const span = now() - workT0; if (span < 2) return;
  const fps = workN / span, avgWork = workAcc / workN; workAcc = 0; workN = 0; workT0 = now();
  stats.fps = fps; stats.work = avgWork; stats.fpsHist.push(fps); if (stats.fpsHist.length > 60) stats.fpsHist.shift();
  if (fps < FPS_CAP * .7 && Q > .4) { Q = Math.max(.4, Q * .75); calmSince = now(); resize(); }
  else if (fps > FPS_CAP * .95 && avgWork < 6 && Q < 1 && now() - calmSince > 8) { Q = Math.min(1, Q / .75); resize(); }
}
function resize() {
  const scale = Math.min(1, 960 / Math.max(innerWidth, innerHeight)) * Q;
  W = cv.width = Math.round(innerWidth * scale); H = cv.height = Math.round(innerHeight * scale);
  back.width = W; back.height = Math.round(H * .46) + 1;
}
addEventListener('resize', resize); resize();

// --- état de la scène
let hue = 0, hueTarget = 0, kickFlash = 0, jumpFlash = 0, lastT = now(), started = false, idleT = now(), lastBandSample = 0;
const disp = { sub: 0, bass: 0, mid: 0, high: 0 };
const follow = (c, tgt, up, down) => c + (tgt - c) * (tgt > c ? up : down);
const waves = [], events = [], lightning = new Lightning();
const hasSky = () => sceneById(sceneId).cats.includes('sky');   // pas de foudre au fond des océans
let curW = { w: 'clear', k: 0, dark: 0, rainbow: 0 };
let layers = makeLayers(A.S, A.step), layersN = A.S.length;
const stars = Array.from({ length: 110 }, () => ({ x: rng(), y: rng() * .6, s: .5 + rng() * rng() * 2.2, p: rng() * TAU, col: rng() < .12 ? '190,210,255' : rng() < .2 ? '255,225,190' : '234,231,221' }));
const streaks = Array.from({ length: 36 }, () => ({ x: rng(), y: .1 + rng() * .7, v: .3 + rng() * .7, len: .02 + rng() * .06, band: BANDS[1 + Math.floor(rng() * 3)] }));
const clouds = Array.from({ length: 9 }, () => makeCloud(rng)).sort((a, b) => a.depth - b.depth);
const cloudSprites = new CloudSprites((w, h) => { const cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h; return { canvas: cv2, ctx: cv2.getContext('2d') }; });
let mouseX = .5, mouseY = .5;
const geo = { horizon: 0, wTop: 0, parX: 0, layerGeom: null };
addEventListener('mousemove', e => { mouseX = e.clientX / innerWidth; mouseY = e.clientY / innerHeight; idleT = now(); }, { passive: true });
function onKick(k, horizon) { stats.kicks++; kickFlash = Math.max(kickFlash, k); hueTarget += 15 + 30 * k * (rng() < .5 ? 1 : -1); waves.push({ r: 0, a: .7 * k }); if (curW.w === 'storm' && curW.k > .3 && k > .4 && now() - lightning.t > 1.5 && hasSky()) lightning.strike(W, horizon, rng, now()); }

// --- scènes : même moteur, compositions différentes ; changement à la main ou à chaque nouveau morceau
let sceneId = sceneById(store.get('horizon.scene', 'horizon')).id, autoScene = store.get('horizon.autoScene', true);
function setScene(id, silent) {
  sceneId = sceneById(id).id; store.set('horizon.scene', sceneId);
  const ok = allowedTypes(sceneId); for (let i = events.length - 1; i >= 0; i--) if (!ok.includes(events[i].type)) events.splice(i, 1);
  syncSceneUi(); if (!silent) plPanel.announce({ name: `Scène : ${sceneById(sceneId).name}` });
}
function syncSceneUi() { const sel = document.getElementById('sceneSel'); if (sel) sel.value = sceneId; const auto = document.getElementById('autoScene'); if (auto) auto.checked = autoScene; if (typeof controls !== 'undefined' && controls) controls.setScene(sceneById(sceneId).name); }
const RENDER = { horizon: renderHorizon, valley: renderValley, city: renderCity, sea: renderSea };
// Dessins fournis aux scènes
const D = {
  drawSky, drawBodies, drawStreaks, drawClouds, drawEvent, drawLayer, drawRain, drawSnow, drawFog, drawAurora, drawRainbow,
  drawWater: (c, S, horizon, wTop, src, srcVis) => drawWater(c, back, bctx, cv, { W: S.W, H: S.H, horizon, wTop, tn: S.tn, sky: S.sky, wx: S.wx, lvl: S.lvl, bass: S.disp.bass, hs: S.hs, hb: S.hb, src, srcVis, reduced: REDUCED }),
};

function frame() {
  const tn = now(); if (tn - lastDraw < 1 / FPS_CAP - .003) { requestAnimationFrame(frame); return; } lastDraw = tn;
  const w0 = performance.now(), dt = Math.min(.1, tn - lastT); lastT = tn;
  const t = audio.currentTime || 0, playing = started && !audio.paused, lead = A === LIVE ? .08 : 0;   // à l'écoute d'un inconnu, le relief se forme hors écran, à droite
  const parX = mouseX - .5, parY = mouseY - .5;
  let b = playing ? analyse() : null, kick = 0;
  if (b) { kick = kickDet.feed(b.kickE, tn); if (A === LIVE) { LIVE.feed(t, { loud: b.loud, peak: b.peak, sub: b.sub, bass: b.bass, mid: b.mid, high: b.high }); if (LIVE.S.length !== layersN) { layers = makeLayers(LIVE.S, LIVE.step); layersN = LIVE.S.length; } } }
  else { b = playing ? A.bandsAt(t) : { sub: 0, bass: 0, mid: 0, high: 0 }; if (playing) kick = dataKick.at(t); if (!live) for (let i = 0; i < NSPEC; i++) { const x = i / (NSPEC - 1) * 3, k = Math.floor(x), f = x - k, a0 = b[BANDS[Math.min(3, k)]], a1 = b[BANDS[Math.min(3, k + 1)]]; spec[i] = (a0 + (a1 - a0) * f) * (.6 + .4 * Math.sin(tn * 2.3 + i * .55)); } }
  for (const k of BANDS) disp[k] = follow(disp[k], b[k], .5, .07);
  if (tn - lastBandSample > .25) { lastBandSample = tn; stats.bandHist.push([disp.sub, disp.bass, disp.mid, disp.high]); if (stats.bandHist.length > 240) stats.bandHist.shift(); }
  hue += (hueTarget - hue) * .05 + dt * 3; hueTarget += dt * 3;
  kickFlash *= Math.exp(-dt * 8); jumpFlash *= Math.exp(-dt * 4);
  const lvl = playing ? A.levelAt(t) : .3, sky = skyState(t), wx = weatherAt(t); curW = wx;
  const wind = REDUCED ? 0 : (.004 + lvl * .012) * (wx.w === 'storm' ? 2.5 : wx.w === 'rain' ? 1.6 : 1);
  const S = { W, H, t, tn, dt, sky, wx, disp, lvl, hue, lead, hb: (158 + hue) % 360, hs: (18 + hue) % 360, layers, events, parX, parY, wind, kickFlash, waves, stars, streaks, clouds, cloudSprites, rng, makeLayer, reduced: REDUCED };
  if (kick) onKick(kick, geo.horizon || H * .7);
  if (playing) { const before = events.length; tickEvents(events, dt, sky, wind, wx, rng, tn, allowedTypes(sceneId)); for (const e of events.slice(before)) stats.spawned[e.type] = (stats.spawned[e.type] || 0) + 1; }
  if (wx.w === 'storm' && wx.k > .3 && playing && hasSky() && rng() < dt / 7) lightning.strike(W, geo.horizon || H * .7, rng, tn);

  const R = (RENDER[sceneId] || renderHorizon)(ctx, S, D);
  geo.horizon = R.horizon; geo.wTop = R.wTop; geo.parX = parX; geo.layerGeom = R.layerGeom;
  if (started) waveStrip.render(ctx, { x: 0, y: R.wTop + H * .012, w: W, h: H * .06 }, t, hue);
  // Flashs, foudre, vignettage, timecode
  if (jumpFlash > .02) { ctx.fillStyle = `rgba(234,231,221,${jumpFlash * .1})`; ctx.fillRect(0, 0, W, H); }
  lightning.draw(ctx, tn, W, H);
  if (kickFlash > .02) { ctx.fillStyle = `rgba(255,240,220,${kickFlash * .08})`; ctx.fillRect(0, 0, W, H); }
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, Math.hypot(W, H) / 2); vg.addColorStop(0, 'rgba(6,7,12,0)'); vg.addColorStop(1, `rgba(6,7,12,${lerp(.6, .35, sky.day)})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (!started) { const p = .5 + .5 * Math.sin(tn * 1.2); ctx.strokeStyle = `rgba(234,231,221,${.25 + p * .4})`; ctx.lineWidth = 2; ctx.beginPath(); if (R.src && R.srcVis > .5) ctx.arc(R.src.x, R.src.y, R.src.r * 1.6 + p * 4, 0, TAU); else ctx.arc(W / 2, H / 2, 5 + p * 5, 0, TAU); ctx.stroke(); }
  if (A === LIVE && playing && tn - lastSave > 15) saveCache(false);
  if (!controls.hidden) controls.tick();
  if (started && konsole.hidden && controls.hidden) drawHud(ctx, t, dur(), { W, H }, .5);
  if (!plPanel.hidden && (stats.frames % 15 === 0)) plPanel.el.style.setProperty('--accent', hsl(hue, 'sub', 85, 60));
  document.body.classList.toggle('hidecursor', playing && tn - idleT > 2 && konsole.hidden && plPanel.hidden && controls.hidden);
  adapt(performance.now() - w0);
  if (!konsole.hidden && tn - konsole.last > .25) { konsole.last = tn; konsole.render({ t, sky, wx, playing, live, disp, spec, events, W, H, Q, fpsCap: FPS_CAP, track: playlist.current && playlist.current.name, dur: dur(), scene: sceneById(sceneId).name }); }
  requestAnimationFrame(frame);
}

// --- console, playlist, cache, contrôles
const konsole = new Console(document, () => A, stats, {});
document.getElementById('closeBtn').addEventListener('click', e => { e.stopPropagation(); konsole.toggle(false); });
konsole.el.addEventListener('click', e => e.stopPropagation()); konsole.el.addEventListener('dblclick', e => e.stopPropagation());
const playlist = new Playlist();
playlist.add({ name: trackName(audio.getAttribute('src')), src: audio.getAttribute('src'), isSet: true });
playlist.load(store.get('horizon.playlist', []));
const savePl = () => store.set('horizon.playlist', playlist.toJSON());
const cache = new AnalysisCache(localStorage); let cacheK = null, lastSave = 0;
function loadCache() { const tr = playlist.current; if (!tr || tr.isSet || A !== LIVE || !isFinite(audio.duration)) return; cacheK = cacheKey(tr, audio.duration); const data = cache.load(cacheK); if (data) { LIVE.load(data); layers = makeLayers(LIVE.S, LIVE.step); layersN = LIVE.S.length; } }
function saveCache(complete) { if (A !== LIVE || !cacheK || LIVE.S.length < 4) return; cache.save(cacheK, LIVE, complete || (LIVE.duration >= audio.duration - 1)); lastSave = now(); }
audio.addEventListener('loadedmetadata', loadCache);
audio.addEventListener('pause', () => saveCache(false));
function playTrack(track, retryWithoutCors) {
  if (!track) return;
  saveCache(false); cacheK = null;
  A = track.isSet ? SET : LIVE; if (!track.isSet) LIVE.reset();
  layers = makeLayers(A.S, A.step); layersN = A.S.length; dataKick = new DataKick(A); waveStrip.env = new EnvelopeWaveSource(A, 3); liveWave.reset(); events.length = 0;
  const remote = /^https?:/i.test(track.src);
  if (remote && !retryWithoutCors) audio.crossOrigin = 'anonymous'; else audio.removeAttribute('crossorigin');
  audioFailed = false; audio.src = track.src; started = true; audio.play().then(startAnalyser).catch(() => {});
  if (autoScene && !retryWithoutCors) setScene(nextSceneId(sceneId), true);   // nouvelle piste, nouvelle scène
  plPanel.refresh(); plPanel.announce({ name: `${track.name} · ${sceneById(sceneId).name}` });
}
audio.addEventListener('error', () => { const tr = playlist.current; if (tr && audio.getAttribute('crossorigin') && /^https?:/i.test(tr.src)) { playTrack(tr, true); return; } audioFailed = true; });
audio.addEventListener('ended', () => { saveCache(true); const nx = playlist.next(); if (nx) playTrack(nx); });
const plPanel = new PlaylistPanel(document, playlist, { onPlay: tr => playTrack(tr), onChange: savePl, fetchText: async u => { const r = await fetch(u); if (!r.ok) throw new Error(String(r.status)); return r.text(); }, levels: () => disp, progress: () => (audio.currentTime || 0) / Math.max(1, dur()) });
const controls = new ControlsBar(document, {
  play: () => { if (!started) toggle(); else { audio.play(); if (actx) actx.resume(); } }, pause: () => audio.pause(), isPlaying: () => started && !audio.paused,
  prev: () => playTrack(playlist.prev()), next: () => playTrack(playlist.next()), seek: tt => seekTo(tt), position: () => audio.currentTime || 0, duration: () => dur(), tc,
  volume: v => { audio.volume = clamp(v, 0, 1); }, getVolume: () => audio.volume, level: () => clamp((disp.sub + disp.bass + disp.mid + disp.high) / 3.2, 0, 1), live: () => live,
  togglePlaylist: () => plPanel.toggle(), toggleConsole: () => konsole.toggle(), fullscreen: () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(),
  scenes: SCENES.map(s => s.name), setScene: name => { const sc = SCENES.find(s => s.name === name); if (sc && sc.id !== sceneId) setScene(sc.id); },
});
{ const sel = document.getElementById('sceneSel'), auto = document.getElementById('autoScene');
  if (sel) { for (const sc of SCENES) { const o = document.createElement('option'); o.value = sc.id; o.textContent = `${sc.name} — ${sc.blurb}`; sel.appendChild(o); } sel.addEventListener('change', () => setScene(sel.value)); }
  if (auto) auto.addEventListener('change', () => { autoScene = auto.checked; store.set('horizon.autoScene', autoScene); });
  syncSceneUi(); }
function toggle() {
  if (audioFailed) { plPanel.toggle(true); return; }
  if (!started) { started = true; audio.play().then(startAnalyser).catch(() => {}); return; }
  if (audio.paused) { audio.play(); if (actx) actx.resume(); } else audio.pause();
}
const seekTo = tt => { audio.currentTime = clamp(tt, 0, dur()); jumpFlash = 1; idleT = now(); };
let clickTimer;
document.addEventListener('click', e => {
  clearTimeout(clickTimer);
  const xs = e.clientX / innerWidth * W, ys = e.clientY / innerHeight * H;
  clickTimer = setTimeout(() => { if (!started || ys > geo.wTop) toggle(); else seekTo(timeAt(layers, xs, ys, audio.currentTime, { W, H, horizon: geo.horizon, parX: geo.parX, disp, lead: A === LIVE ? .08 : 0 }, geo.layerGeom)); }, 220);
});
document.addEventListener('dblclick', () => { clearTimeout(clickTimer); document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); });
addEventListener('wheel', e => { if (konsole.el.contains(e.target) || plPanel.el.contains(e.target) || controls.el.contains(e.target)) return; e.preventDefault(); if (started) seekTo(audio.currentTime + e.deltaY * (e.shiftKey ? .6 : .06)); }, { passive: false });
document.addEventListener('keydown', e => {
  if (e.target && e.target.closest && e.target.closest('#controls, #playlist input, #playlist button, #console select, #console input')) return;
  if (e.key === '?' || (e.key === 'h' && !e.ctrlKey)) { e.preventDefault(); konsole.toggle(); return; }
  if (e.key === 'c') { e.preventDefault(); controls.toggle(); return; }
  if (e.key === 'p') { e.preventDefault(); plPanel.toggle(); return; }
  if (e.key === 's') { setScene(nextSceneId(sceneId)); return; }
  if (e.key === 'n') { playTrack(playlist.next()); return; }
  if (e.key === 'b') { playTrack(playlist.prev()); return; }
  if (e.key === 'Escape') { konsole.toggle(false); plPanel.toggle(false); controls.toggle(false); return; }
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  else if (e.key === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  else if (e.key === 'ArrowRight') seekTo(audio.currentTime + (e.shiftKey ? 60 : 10));
  else if (e.key === 'ArrowLeft') seekTo(audio.currentTime - (e.shiftKey ? 60 : 10));
  else if (e.key === 'PageDown') seekTo(audio.currentTime + 300);
  else if (e.key === 'PageUp') seekTo(audio.currentTime - 300);
  else if (e.key === 'Home') seekTo(0);
  else if (e.key === 'End') seekTo(dur() - 5);
  else if (e.key === 'o') document.getElementById('plFiles').click();
  idleT = now();
});
document.addEventListener('touchstart', () => { idleT = now(); }, { passive: true });
if (location.search.includes('test')) { window.__spawn = (type) => { const e = spawn(type, rng, now()); events.push(e); stats.spawned[type] = (stats.spawned[type] || 0) + 1; return e; }; window.__feedLive = (t, smp) => { LIVE.feed(t, smp); if (LIVE.S.length !== layersN) { layers = makeLayers(LIVE.S, LIVE.step); layersN = LIVE.S.length; } }; window.__state = () => ({ live: A === LIVE, tracks: playlist.tracks.map(t => t.name), index: playlist.index, src: audio.currentSrc, scene: sceneId, events: events.map(e => e.type) }); window.__setScene = setScene; window.__biomes = t => ({ city: cityBiomeAt(t).b, sea: seaBiomeAt(t).b }); }
requestAnimationFrame(frame);
