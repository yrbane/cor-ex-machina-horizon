import { hsl } from '../palette.js';

// Rendu d'une forme d'onde dans une boîte : polyligne pour un signal signé, enveloppe miroir pour des amplitudes
export function drawWaveform(ctx, values, box, { mode = 'signal', hue = 0 } = {}) {
  const n = values.length; if (!n) return;
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(values[i]));
  if (peak < .002) return;
  const { x, y, w, h } = box, mid = y + h / 2, amp = h / 2, xAt = i => x + (i / (n - 1)) * w;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (mode === 'signal') {
    // Dégradé horizontal dans la palette du moment : basses à gauche, sub au centre, aigus à droite
    const grad = (l, a) => { const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, hsl(hue, 'bass', 80, l, a)); g.addColorStop(.5, hsl(hue, 'sub', 85, l + 6, a)); g.addColorStop(1, hsl(hue, 'high', 80, l, a)); return g; };
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const py = mid - values[i] * amp; i ? ctx.lineTo(xAt(i), py) : ctx.moveTo(xAt(i), py); }
    ctx.strokeStyle = grad(70, .22); ctx.lineWidth = Math.max(6, h * .28); ctx.stroke();      // lueur
    ctx.strokeStyle = grad(78, .9); ctx.lineWidth = Math.max(2.5, h * .09); ctx.stroke();     // trait
  } else {
    ctx.fillStyle = hsl(hue, 'high', 80, 72, .28); ctx.beginPath();
    for (let i = 0; i < n; i++) { const py = mid - values[i] * amp; i ? ctx.lineTo(xAt(i), py) : ctx.moveTo(xAt(i), py); }
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(xAt(i), mid + values[i] * amp);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = hsl(hue, 'high', 60, 80, .25); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, mid); ctx.lineTo(x + w, mid); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}
