// Barre de contrôles sur la touche c, construite avec les Web Components de potard : transport, position, volume,
// VU-mètre, témoin d'analyse en direct, accès à la playlist, à la console et au plein écran.
// La position utilise le crossfader horizontal de potard, borné de 0 à 1000 (la version embarquée n'a pas de slider).
export class ControlsBar {
  constructor(doc, api) {
    this.doc = doc; this.api = api; this.el = doc.getElementById('controls'); this.dragging = false;
    this.el.addEventListener('click', e => e.stopPropagation()); this.el.addEventListener('dblclick', e => e.stopPropagation());
    this.el.addEventListener('wheel', e => e.stopPropagation());
    this.el.innerHTML = `
      <div class="ctl-group ctl-transport">
        <pt-button id="ctPrev" title="Piste précédente (b)">‹‹</pt-button>
        <pt-button id="ctPlay" toggle title="Lecture ou pause (espace)">▶</pt-button>
        <pt-button id="ctNext" title="Piste suivante (n)">››</pt-button>
      </div>
      <div class="ctl-group ctl-position">
        <span class="ctl-time" id="ctTime">00:00:00</span>
        <pt-crossfader id="ctPos" min="0" max="1000" value="0" default="0" label="Position" sensitivity="600"></pt-crossfader>
        <span class="ctl-time" id="ctDur">00:00:00</span>
      </div>
      <div class="ctl-group ctl-mix">
        <pt-knob id="ctVol" min="0" max="1" value="1" default="1" label="Volume"></pt-knob>
        <pt-vumeter id="ctVu" segments="18" orientation="h"></pt-vumeter>
        <span class="ctl-led"><pt-led id="ctLive" color="#3ddc84"></pt-led><small>direct</small></span>
      </div>
      <div class="ctl-group ctl-panels">
        <pt-button id="ctList" title="Playlist (p)">Playlist</pt-button>
        <pt-button id="ctHelp" title="Aide et statistiques (?)">Aide</pt-button>
        <pt-button id="ctFull" title="Plein écran (f)">Plein écran</pt-button>
      </div>`;
    const $ = id => doc.getElementById(id);
    this.play = $('ctPlay'); this.pos = $('ctPos'); this.vol = $('ctVol'); this.vu = $('ctVu'); this.led = $('ctLive'); this.time = $('ctTime'); this.durEl = $('ctDur');
    $('ctPrev').addEventListener('press', () => api.prev()); $('ctNext').addEventListener('press', () => api.next());
    this.play.addEventListener('change', e => { if (e.detail) api.play(); else api.pause(); });
    this.pos.addEventListener('input', e => { this.dragging = true; this.time.textContent = api.tc(e.detail / 1000 * api.duration()); });
    this.pos.addEventListener('change', e => { this.dragging = false; api.seek(e.detail / 1000 * api.duration()); });
    this.vol.addEventListener('input', e => api.volume(e.detail)); this.vol.addEventListener('change', e => api.volume(e.detail));
    $('ctList').addEventListener('press', () => api.togglePlaylist()); $('ctHelp').addEventListener('press', () => api.toggleConsole()); $('ctFull').addEventListener('press', () => api.fullscreen());
  }
  get hidden() { return this.el.hidden; }
  toggle(show) { this.el.hidden = show === undefined ? !this.el.hidden : !show; if (!this.el.hidden) this.tick(); }
  // Rafraîchit position, VU-mètre, témoin et bouton de lecture ; à appeler à chaque image quand la barre est visible
  tick() {
    if (this.el.hidden) return;
    const api = this.api, playing = api.isPlaying(), d = api.duration(), t = api.position();
    if (this.play.active !== playing) this.play.active = playing; this.play.textContent = playing ? '❚❚' : '▶';
    if (!this.dragging) { this.pos.value = d > 0 ? Math.round(t / d * 1000) : 0; this.time.textContent = api.tc(t); }
    this.durEl.textContent = api.tc(d);
    this.vu.level = api.level(); this.led.on = api.live();
    if (Math.abs(this.vol.value - api.getVolume()) > .01 && !this.volDragging) this.vol.value = api.getVolume();
  }
}
