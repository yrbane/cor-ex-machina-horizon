// Cache des analyses construites en direct : une piste déjà entendue retrouve son paysage sans le recalculer.
// Clé : nom et durée arrondie, pour survivre aux URL de session des fichiers locaux. Stockage compact, éviction des plus anciens.
export const cacheKey = (track, duration) => `${track.name}|${Math.round(duration)}`;
const r2 = v => Math.round(v * 100) / 100;

export class AnalysisCache {
  constructor(storage, prefix = 'horizon.analysis.') { this.st = storage; this.prefix = prefix; }
  load(key) {
    try { const raw = this.st.getItem(this.prefix + key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  save(key, analysis, complete) {
    const data = { step: analysis.step, complete: !!complete, at: Date.now(), S: analysis.S.map(r2), M: analysis.M.map(r2), PK: analysis.PK.map(r2),
      bands: Object.fromEntries(Object.entries(analysis.bands).map(([b, arr]) => [b, arr.map(r2)])) };
    const raw = JSON.stringify(data);
    for (let attempt = 0; attempt < 12; attempt++) {
      try { this.st.setItem(this.prefix + key, raw); return true; }
      catch (e) { if (!this.evictOldest(key)) return false; }
    }
    return false;
  }
  // Retire l'entrée la plus ancienne du cache, autre que celle en cours d'écriture
  evictOldest(except) {
    let oldest = null, oldestAt = Infinity;
    for (let i = 0; i < this.st.length; i++) {
      const k = this.st.key(i); if (!k || !k.startsWith(this.prefix) || k === this.prefix + except) continue;
      let at = 0; try { at = JSON.parse(this.st.getItem(k)).at || 0; } catch (e) { at = 0; }
      if (at < oldestAt) { oldestAt = at; oldest = k; }
    }
    if (!oldest) return false;
    this.st.removeItem(oldest); return true;
  }
}
