import { ContinuousControl } from './base-control.js';
/** Fader vertical (volume, tempo). */
export class PtFader extends ContinuousControl {
    renderControl(ctx, w, h) {
        const trackX = w / 2;
        const pad = 8;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = this.trackColor;
        ctx.beginPath();
        ctx.moveTo(trackX, pad);
        ctx.lineTo(trackX, h - pad);
        ctx.stroke();
        // poignée
        const y = pad + (1 - this.fraction) * (h - 2 * pad);
        ctx.fillStyle = this.accentColor;
        ctx.fillRect(4, y - 5, w - 8, 10);
        ctx.fillStyle = '#12151a';
        ctx.fillRect(4, y - 1, w - 8, 2);
    }
}
