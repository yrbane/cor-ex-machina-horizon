import { isAudioUrl, trackName, parseDirectoryListing, iconFor, fmtDuration } from './playlist.js';

// Panneau de playlist : pistes avec icône, durée, égaliseur et progression sur la piste en cours, réordonnancement
// à la souris, mélange, boucle, dépôt de fichiers et de dossiers n'importe où sur la page, toast à chaque changement.
export class PlaylistPanel {
  constructor(doc, playlist, { onPlay, onChange, fetchText, levels, progress }) {
    this.doc = doc; this.pl = playlist; this.onPlay = onPlay; this.onChange = onChange; this.fetchText = fetchText; this.levels = levels; this.progress = progress;
    this.el = doc.getElementById('playlist'); this.list = doc.getElementById('plList'); this.msg = doc.getElementById('plMsg'); this.count = doc.getElementById('plCount');
    this.toast = doc.getElementById('toast'); this.drop = doc.getElementById('dropzone'); this.toastTimer = 0; this.dragFrom = -1;
    this.el.addEventListener('click', e => e.stopPropagation()); this.el.addEventListener('dblclick', e => e.stopPropagation());
    doc.getElementById('plClose').addEventListener('click', () => this.toggle(false));
    doc.getElementById('plFiles').addEventListener('change', e => this.addFiles([...e.target.files]));
    doc.getElementById('plFolder').addEventListener('change', e => this.addFiles([...e.target.files].sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name))));
    const url = doc.getElementById('plUrl'); doc.getElementById('plAddUrl').addEventListener('click', () => { this.addUrl(url.value.trim()); url.value = ''; });
    url.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.addUrl(url.value.trim()); url.value = ''; } e.stopPropagation(); });
    doc.getElementById('plClear').addEventListener('click', () => { this.pl.clear(); this.changed('La mer est calme. Il ne reste que le set.'); });
    doc.getElementById('plShuffle').addEventListener('click', () => { this.pl.shuffle(); this.changed('Pistes mélangées, le set garde la tête.'); });
    this.loopBtn = doc.getElementById('plLoop'); this.loopBtn.addEventListener('click', () => { this.pl.loop = !this.pl.loop; this.refresh(); this.say(this.pl.loop ? 'La liste tourne en boucle.' : 'La liste s’arrête à la dernière piste.'); });
    this.installDrop();
    setInterval(() => this.tick(), 120);
  }
  get hidden() { return this.el.hidden; }
  toggle(show) { this.el.hidden = show === undefined ? !this.el.hidden : !show; if (!this.el.hidden) this.refresh(); }
  say(text) { this.msg.textContent = text || ''; }
  changed(text) { this.refresh(); this.say(text); this.onChange(); }
  announce(track) {
    if (!track) return;
    this.toast.innerHTML = `<span class="ico">${iconFor(track.name)}</span>${track.name}`;
    this.toast.classList.remove('show'); void this.toast.offsetWidth; this.toast.classList.add('show');
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => this.toast.classList.remove('show'), 3200);
  }
  // Durée lue depuis les métadonnées, quand le navigateur y a accès
  probe(track) {
    if (track.duration || track.probing) return; track.probing = true;
    const a = new Audio(); a.preload = 'metadata'; a.addEventListener('loadedmetadata', () => { track.duration = a.duration; this.refresh(); }); a.addEventListener('error', () => { track.probing = false; }); a.src = track.src;
  }
  addTracks(list, what) {
    let n = 0; for (const t of list) if (this.pl.add(t)) { n++; this.probe(t); t.fresh = true; }
    this.changed(n ? `${n} piste${n > 1 ? 's' : ''} ${n > 1 ? 'embarquées' : 'embarquée'}${what ? ' ' + what : ''}.` : 'Rien de nouveau à embarquer.');
    return n;
  }
  addFiles(files) {
    const audio = files.filter(f => isAudioUrl(f.name) || (f.type || '').startsWith('audio/'));
    if (!audio.length) { this.say('Aucun fichier audio là-dedans.'); return; }
    this.addTracks(audio.map(f => ({ name: trackName(f.webkitRelativePath || f.name), src: URL.createObjectURL(f), local: true })));
  }
  async addUrl(u) {
    if (!u) return;
    if (isAudioUrl(u)) { this.addTracks([{ name: trackName(u), src: u }], 'depuis le web'); return; }
    this.say('Lecture du dossier…');
    try {
      const html = await this.fetchText(u), found = parseDirectoryListing(html, u.endsWith('/') ? u : u + '/');
      if (!found.length) { this.say('Aucun fichier audio dans cet index de dossier.'); return; }
      this.addTracks(found.map(src => ({ name: trackName(src), src })), 'depuis le dossier');
    } catch (e) { this.say('Dossier inaccessible : le serveur doit être celui qui sert cette page, ou autoriser la lecture depuis elle.'); }
  }
  // Dépôt n'importe où sur la page : fichiers et dossiers, explorés récursivement quand le navigateur le permet
  installDrop() {
    const doc = this.doc; let depth = 0;
    doc.addEventListener('dragenter', e => { if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return; e.preventDefault(); depth++; doc.body.classList.add('dropping'); });
    doc.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    doc.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; doc.body.classList.remove('dropping'); } });
    doc.addEventListener('drop', async e => {
      e.preventDefault(); depth = 0; doc.body.classList.remove('dropping');
      const items = [...(e.dataTransfer.items || [])], files = [];
      const walk = entry => new Promise(res => { if (entry.isFile) entry.file(f => { files.push(f); res(); }, res); else if (entry.isDirectory) { const r = entry.createReader(); const read = () => r.readEntries(async ents => { if (!ents.length) return res(); for (const en of ents) await walk(en); read(); }, res); read(); } else res(); });
      const entries = items.map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
      if (entries.length) for (const en of entries) await walk(en); else files.push(...e.dataTransfer.files);
      this.addFiles(files.sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name)));
      this.toggle(true);
    });
  }
  // Égaliseur et progression de la piste en cours, huit fois par seconde quand le panneau est visible
  tick() {
    if (this.el.hidden) return;
    const li = this.list.querySelector('li.current'); if (!li) return;
    const lv = this.levels(), bars = li.querySelectorAll('.eq i');
    [lv.sub, lv.bass, lv.mid, lv.high].forEach((v, i) => { if (bars[i]) bars[i].style.height = `${20 + v * 80}%`; });
    const p = this.progress(), bar = li.querySelector('.prog i'); if (bar) bar.style.width = `${Math.round(p * 100)}%`;
  }
  refresh() {
    this.list.innerHTML = '';
    const n = this.pl.length, total = this.pl.totalDuration();
    this.count.textContent = `${n} piste${n > 1 ? 's' : ''}${total ? ' · ' + fmtDuration(total) : ''}`;
    this.loopBtn.textContent = this.pl.loop ? 'Boucle : oui' : 'Boucle : non'; this.loopBtn.setAttribute('aria-pressed', String(this.pl.loop));
    this.pl.tracks.forEach((t, i) => {
      const li = this.doc.createElement('li'); li.draggable = !t.isSet; li.dataset.i = i;
      if (i === this.pl.index) li.className = 'current'; if (t.fresh) { li.classList.add('fresh'); t.fresh = false; }
      li.innerHTML = `<span class="ico">${iconFor(t.name)}</span><button class="name" title="${t.src.replace(/"/g, '&quot;')}"><span>${t.name}</span><small>${t.isSet ? 'le set, paysage précalculé' : t.local ? 'fichier local' : 'web'}${t.duration ? ' · ' + fmtDuration(t.duration) : ''}</small></button>` +
        (i === this.pl.index ? '<span class="eq"><i></i><i></i><i></i><i></i></span>' : '') + (t.isSet ? '' : '<button class="rm" title="Retirer">×</button>') + (i === this.pl.index ? '<span class="prog"><i></i></span>' : '');
      li.querySelector('.name').addEventListener('click', () => { this.pl.select(i); this.onPlay(t); this.refresh(); });
      const rm = li.querySelector('.rm'); if (rm) rm.addEventListener('click', () => { const wasCurrent = i === this.pl.index; this.pl.remove(i); if (wasCurrent) this.onPlay(this.pl.current); this.changed(`« ${t.name} » a quitté la liste.`); });
      li.addEventListener('dragstart', e => { this.dragFrom = i; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); });
      li.addEventListener('dragend', () => { li.classList.remove('dragging'); this.dragFrom = -1; });
      li.addEventListener('dragover', e => { if (this.dragFrom < 0) return; e.preventDefault(); e.stopPropagation(); li.classList.add('over'); });
      li.addEventListener('dragleave', () => li.classList.remove('over'));
      li.addEventListener('drop', e => { if (this.dragFrom < 0) return; e.preventDefault(); e.stopPropagation(); this.pl.move(this.dragFrom, i); this.dragFrom = -1; this.changed(''); });
      this.list.appendChild(li);
    });
  }
}
