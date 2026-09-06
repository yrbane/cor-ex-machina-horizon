import { isAudioUrl, trackName, parseDirectoryListing } from './playlist.js';

// Panneau de playlist : liste des pistes, ajout de fichiers, d'un dossier, d'une URL de fichier ou de dossier
export class PlaylistPanel {
  constructor(doc, playlist, { onPlay, onChange, fetchText }) {
    this.doc = doc; this.pl = playlist; this.onPlay = onPlay; this.onChange = onChange; this.fetchText = fetchText;
    this.el = doc.getElementById('playlist'); this.list = doc.getElementById('plList'); this.msg = doc.getElementById('plMsg');
    this.el.addEventListener('click', e => e.stopPropagation()); this.el.addEventListener('dblclick', e => e.stopPropagation());
    doc.getElementById('plClose').addEventListener('click', () => this.toggle(false));
    doc.getElementById('plFiles').addEventListener('change', e => this.addFiles([...e.target.files]));
    doc.getElementById('plFolder').addEventListener('change', e => this.addFiles([...e.target.files].sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name))));
    const url = doc.getElementById('plUrl'); doc.getElementById('plAddUrl').addEventListener('click', () => this.addUrl(url.value.trim()));
    url.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.addUrl(url.value.trim()); } e.stopPropagation(); });
    doc.getElementById('plClear').addEventListener('click', () => { this.pl.clear(); this.changed('Playlist vidée, le set reste.'); });
  }
  get hidden() { return this.el.hidden; }
  toggle(show) { this.el.hidden = show === undefined ? !this.el.hidden : !show; if (!this.el.hidden) this.refresh(); }
  say(text) { this.msg.textContent = text || ''; }
  changed(text) { this.refresh(); this.say(text); this.onChange(); }
  addFiles(files) {
    const audio = files.filter(f => isAudioUrl(f.name) || (f.type || '').startsWith('audio/'));
    let n = 0; for (const f of audio) if (this.pl.add({ name: trackName(f.webkitRelativePath || f.name), src: URL.createObjectURL(f), local: true })) n++;
    this.changed(n ? `${n} piste${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}.` : 'Aucun fichier audio dans la sélection.');
  }
  async addUrl(u) {
    if (!u) return;
    if (isAudioUrl(u)) { this.changed(this.pl.add({ name: trackName(u), src: u }) ? 'Piste ajoutée.' : 'Déjà dans la liste.'); return; }
    this.say('Lecture du dossier…');
    try {
      const html = await this.fetchText(u), found = parseDirectoryListing(html, u.endsWith('/') ? u : u + '/');
      let n = 0; for (const src of found) if (this.pl.add({ name: trackName(src), src })) n++;
      this.changed(found.length ? `${n} piste${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''} depuis le dossier.` : 'Aucun fichier audio trouvé dans cet index de dossier.');
    } catch (e) { this.say('Dossier inaccessible : le serveur doit autoriser la lecture depuis cette page (CORS), ou être le même que celui qui la sert.'); }
  }
  refresh() {
    this.list.innerHTML = '';
    this.pl.tracks.forEach((t, i) => {
      const li = this.doc.createElement('li'); if (i === this.pl.index) li.className = 'current';
      const play = this.doc.createElement('button'); play.textContent = i === this.pl.index ? '▶ ' + t.name : t.name; play.title = t.src; play.addEventListener('click', () => { this.pl.select(i); this.onPlay(t); this.refresh(); });
      li.appendChild(play);
      if (!t.isSet) { const rm = this.doc.createElement('button'); rm.className = 'rm'; rm.textContent = '×'; rm.title = 'Retirer'; rm.addEventListener('click', () => { const wasCurrent = i === this.pl.index; this.pl.remove(i); if (wasCurrent) this.onPlay(this.pl.current); this.changed('Piste retirée.'); }); li.appendChild(rm); }
      this.list.appendChild(li);
    });
  }
}
