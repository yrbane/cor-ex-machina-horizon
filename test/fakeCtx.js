// Faux contexte canvas : enregistre chaque appel et chaque propriété écrite, pour tester les dessins sans navigateur
export function fakeCtx() {
  const calls = [];
  const props = {};
  const gradient = () => ({ addColorStop: (o, c) => calls.push(['addColorStop', o, c]) });
  const target = {
    calls, props,
    createLinearGradient: (...a) => { calls.push(['createLinearGradient', ...a]); return gradient(); },
    createRadialGradient: (...a) => { calls.push(['createRadialGradient', ...a]); return gradient(); },
    measureText: t => ({ width: t.length * 7 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  target.count = name => calls.filter(c => c[0] === name).length;
  target.texts = () => calls.filter(c => c[0] === 'fillText' || c[0] === 'strokeText').map(c => c[1]);
  target.setValues = key => calls.filter(c => c[0] === 'set:' + key).map(c => c[1]);
  const ctx = new Proxy(target, {
    get(obj, key) {
      if (key in obj) return obj[key];
      if (typeof key === 'symbol') return undefined;
      return (...args) => { calls.push([key, ...args]); };
    },
    set(obj, key, value) { props[key] = value; calls.push(['set:' + key, value]); return true; },
  });
  return ctx;
}

// Générateur pseudo-aléatoire déterministe pour les tests
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
