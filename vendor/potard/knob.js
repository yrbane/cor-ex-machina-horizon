import { ContinuousControl } from './base-control.js';
const ARC_START = (-3 * Math.PI) / 4 - Math.PI / 2;
const ARC_SPAN = (3 * Math.PI) / 2;
/** Potentiomètre rotatif façon Ableton : drag vertical, anneau de valeur. */
export class PtKnob extends ContinuousControl {
    renderControl(ctx, w, h) {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) / 2 - 4;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        // piste
        ctx.strokeStyle = this.trackColor;
        ctx.beginPath();
        ctx.arc(cx, cy, r, ARC_START, ARC_START + ARC_SPAN);
        ctx.stroke();
        // valeur (bipolaire depuis le centre si min < 0 < max)
        const bipolar = this.min < 0 && this.max > 0;
        const zeroFrac = bipolar ? -this.min / this.range : 0;
        const from = ARC_START + ARC_SPAN * zeroFrac;
        const to = ARC_START + ARC_SPAN * this.fraction;
        ctx.strokeStyle = this.accentColor;
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.min(from, to), Math.max(from, to));
        ctx.stroke();
        // index
        const angle = ARC_START + ARC_SPAN * this.fraction;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r * 0.35, cy + Math.sin(angle) * r * 0.35);
        ctx.lineTo(cx + Math.cos(angle) * r * 0.85, cy + Math.sin(angle) * r * 0.85);
        ctx.stroke();
    }
}
