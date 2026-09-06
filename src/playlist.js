// Playlist : liste de pistes { name, src, isSet?, local? }, piste courante, boucle, persistance des entrées distantes

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|webm|aiff?)$/i;
export const isAudioUrl = u => AUDIO_EXT.test(String(u).split(/[?#]/)[0]);
export function trackName(u) {
  const last = String(u).split(/[?#]/)[0].split('/').filter(Boolean).pop() || String(u);
  let name = last; try { name = decodeURIComponent(last); } catch (e) { /* nom brut si l'encodage est invalide */ }
  return name.replace(/\.[a-z0-9]+$/i, '');
}
// Index de dossier servi en HTTP : on garde les liens vers des fichiers audio, résolus en absolu, sans doublon
export function parseDirectoryListing(html, baseUrl) {
  const out = [], seen = new Set(), re = /href\s*=\s*["']([^"']+)["']/gi; let m;
  while ((m = re.exec(html))) {
    let abs; try { abs = new URL(m[1], baseUrl).href; } catch (e) { continue; }
    if (!isAudioUrl(abs) || seen.has(abs)) continue;
    seen.add(abs); out.push(abs);
  }
  return out;
}

export class Playlist {
  constructor() { this.tracks = []; this.index = 0; }
  get length() { return this.tracks.length; }
  get current() { return this.tracks[this.index]; }
  add(track) { if (this.tracks.some(t => t.src === track.src)) return false; this.tracks.push(track); return true; }
  select(i) { if (i >= 0 && i < this.tracks.length) this.index = i; return this.current; }
  next() { if (this.tracks.length) this.index = (this.index + 1) % this.tracks.length; return this.current; }
  prev() { if (this.tracks.length) this.index = (this.index - 1 + this.tracks.length) % this.tracks.length; return this.current; }
  remove(i) {
    if (i < 0 || i >= this.tracks.length) return;
    this.tracks.splice(i, 1);
    if (this.index > i || this.index >= this.tracks.length) this.index = Math.max(0, Math.min(this.index, this.tracks.length - 1));
    if (this.index === i && i >= this.tracks.length) this.index = 0;
  }
  clear() { this.tracks = this.tracks.filter(t => t.isSet); this.index = 0; }
  // Seules les pistes distantes ont un sens après rechargement ; les fichiers locaux sont des URL de session
  toJSON() { return this.tracks.filter(t => !t.isSet && !t.local).map(({ name, src }) => ({ name, src })); }
  load(list) { for (const t of list || []) if (t && t.src && t.name) this.add({ name: t.name, src: t.src }); }
}
