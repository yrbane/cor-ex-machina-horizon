import { tc } from './util.js';

// Affichage discret de la position et de la durée, en bas à gauche
export const hudText = (t, dur) => `${tc(t)} / ${tc(dur)}`;

export function drawHud(ctx, t, dur, { W, H }, alpha) {
  if (alpha <= 0) return;
  const size = Math.max(11, Math.round(H * .022)), text = hudText(t, dur);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
  ctx.font = `300 ${size}px "Avenir Next", "Helvetica Neue", "Inter", "Segoe UI", system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, size * .25); ctx.strokeStyle = 'rgba(6,7,12,.55)';
  ctx.strokeText(text, Math.round(H * .03), H - Math.round(H * .03));
  ctx.fillStyle = 'rgba(234,231,221,.9)'; ctx.fillText(text, Math.round(H * .03), H - Math.round(H * .03));
  ctx.globalAlpha = 1;
}
