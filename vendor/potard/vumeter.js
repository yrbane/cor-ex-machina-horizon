const DEFAULT_SEGMENTS = 12;
/**
 * VU-mètre à segments avec mémoire de pic.
 * Attributs : `segments` (défaut 12), `orientation` ('v' vertical par défaut, 'h' horizontal).
 * Propriétés : `level` (0..1), `peak`, `resetPeak()`.
 */
export class PtVumeter extends HTMLElement {
    static observedAttributes = ['segments', 'orientation'];
    #level = 0;
    #peak = 0;
    #canvas = null;
    #raf = 0;
    connectedCallback() {
        if (!this.shadowRoot) {
            const root = this.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = `:host{display:inline-block;}canvas{display:block;width:100%;height:100%;}`;
            this.#canvas = document.createElement('canvas');
            root.append(style, this.#canvas);
        }
        this.#requestRender();
    }
    attributeChangedCallback() {
        this.#requestRender();
    }
    get segments() {
        const n = Number(this.getAttribute('segments'));
        return Number.isInteger(n) && n > 0 ? n : DEFAULT_SEGMENTS;
    }
    get orientation() {
        return this.getAttribute('orientation') === 'h' ? 'h' : 'v';
    }
    get level() {
        return this.#level;
    }
    set level(v) {
        this.#level = Math.min(1, Math.max(0, v));
        this.#peak = Math.max(this.#peak, this.#level);
        this.#requestRender();
    }
    get peak() {
        return this.#peak;
    }
    resetPeak() {
        this.#peak = this.#level;
        this.#requestRender();
    }
    #requestRender() {
        if (this.#raf || !this.#canvas)
            return;
        this.#raf = requestAnimationFrame(() => {
            this.#raf = 0;
            this.#draw();
        });
    }
    #draw() {
        const canvas = this.#canvas;
        if (!canvas)
            return;
        const w = this.clientWidth;
        const h = this.clientHeight;
        if (w === 0 || h === 0)
            return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);
        const count = this.segments;
        const horizontal = this.orientation === 'h';
        const length = horizontal ? w : h;
        const gap = 2;
        const segLen = (length - gap * (count - 1)) / count;
        const lit = Math.round(this.#level * count);
        for (let i = 0; i < count; i++) {
            const frac = (i + 1) / count;
            const color = frac > 0.85 ? '#ff4444' : frac > 0.65 ? '#ffcc33' : '#33dd66';
            ctx.fillStyle = i < lit ? color : '#2a2f36';
            const offset = i * (segLen + gap);
            if (horizontal)
                ctx.fillRect(offset, 0, segLen, h);
            else
                ctx.fillRect(0, length - offset - segLen, w, segLen);
        }
        // ligne de pic
        if (this.#peak > 0) {
            ctx.fillStyle = '#ffffff';
            if (horizontal)
                ctx.fillRect(Math.min(w - 2, this.#peak * w - 1), 0, 2, h);
            else
                ctx.fillRect(0, Math.max(0, h - this.#peak * h - 1), w, 2);
        }
    }
}
