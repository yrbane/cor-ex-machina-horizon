// Assemble le fichier unique : gabarit HTML + modules concaténés (imports et exports retirés) + données d'analyse
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const ORDER = ['src/util.js', 'src/palette.js', 'src/analysis.js', 'src/sky.js', 'src/weather.js', 'src/events.js', 'src/draw/bodies.js', 'src/draw/landscape.js', 'src/draw/events.js', 'src/draw/weather.js', 'src/draw/water.js', 'src/draw/console.js', 'src/draw/waveform.js', 'src/waveform.js', 'src/draw/clouds.js', 'src/hud.js', 'src/live-analysis.js', 'src/analysis-cache.js', 'src/playlist.js', 'src/playlist-panel.js', 'src/controls.js', 'src/main.js'];

// Les modules sont concaténés dans une seule portée : imports retirés, exports mis à nu, ré-exports supprimés
const strip = src => src
  .replace(/^import .*?;\s*$/gm, '')
  .replace(/^export \{[^}]*\}( from [^;]+)?;?\s*$/gm, '')
  .replace(/^export (default )?/gm, '');
// potard (MIT, yrbane) : contrôles audio en Web Components, embarqués depuis vendor/potard
const VENDOR = ['labels', 'base-control', 'crossfade', 'knob', 'fader', 'crossfader', 'button', 'vumeter', 'switch', 'xy', 'stepper', 'led', 'index'].map(f => `vendor/potard/${f}.js`);

const modules = [...VENDOR, ...ORDER].map(f => `// ---- ${f}\n${strip(readFileSync(join(root, f), 'utf8'))}`).join('\n');
const script = `(() => {\n'use strict';\n${modules}\n})();`;

// Vérification syntaxique du script assemblé avant écriture
const tmp = join(root, '.build.check.js'); writeFileSync(tmp, script);
execFileSync(process.execPath, ['--check', tmp], { stdio: 'inherit' });

const data = readFileSync(join(root, 'data/analysis.json'), 'utf8').replace(/<\//g, '<\\/');
const html = readFileSync(join(root, 'template.html'), 'utf8')
  .replaceAll('__VERSION__', pkg.version)
  .replace('__AUDIO__', process.env.AUDIO || 'EMT - la machine 260905 - master.mp3')
  .replace('__DATA__', () => data)
  .replace('__SCRIPT__', () => script);
const out = process.env.OUT || join(root, '..', 'EMT - la machine 260905 - horizon.html');
writeFileSync(out, html);
console.log(`${out} — ${Math.round(statSync(out).size / 1024)} Ko, version ${pkg.version}`);
