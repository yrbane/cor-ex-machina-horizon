import { syncLabelAria } from './labels.js';
/**
 * Surface de contrôle XY (façon Kaoss pad / Push). Positionnement absolu au
 * pointeur (bas-gauche = min), flèches clavier, double-clic = défauts.
 * Attributs : `min-x max-x value-x default-x` (idem `-y`), `label`, `disabled`.
 * Événements `input`/`change` (detail: { x, y }).
 */
export class PtXY extends HTMLElement {
    static observedAttributes = ['value-x', 'value-y', 'label', 'disabled'];
    #x = null;
    #y = null;
    #raf = 0;
    #canvas = null;
    #onMove = (e) => {
        this.#pointTo(e.clientX, e.clientY);
    };
    #onUp = () => {
        window.removeEventListener('pointermove', this.#onMove);
        window.removeEventListener('pointerup', this.#onUp);
        this.#emit('change');
    };
    constructor() {
        super();
        this.addEventListener('pointerdown', (e) => {
            if (this.disabled)
                return;
            e.preventDefault();
            const me = e;
            this.#pointTo(me.clientX, me.clientY);
            window.addEventListener('pointermove', this.#onMove);
            window.addEventListener('pointerup', this.#onUp);
        });
        this.addEventListener('dblclick', () => {
            if (this.disabled)
                return;
            this.#set(this.#num('default-x', this.#center('x')), this.#num('default-y', this.#center('y')));
            this.#emit('input');
            this.#emit('change');
        });
        this.addEventListener('keydown', (e) => {
            if (this.disabled)
                return;
            const ke = e;
            const stepX = this.#range('x') / 100;
            const stepY = this.#range('y') / 100;
            const moves = {
                ArrowLeft: [-stepX, 0],
                ArrowRight: [stepX, 0],
                ArrowDown: [0, -stepY],
                ArrowUp: [0, stepY],
            };
            const move = moves[ke.key];
            if (!move)
                return;
            e.preventDefault();
            this.#set(this.x + move[0], this.y + move[1]);
            this.#emit('input');
            this.#emit('change');
        });
    }
    connectedCallback() {
        this.setAttribute('role', 'slider');
        if (!this.hasAttribute('tabindex'))
            this.tabIndex = 0;
        this.#syncAria();
        syncLabelAria(this);
        if (!this.shadowRoot) {
            const root = this.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = `:host{display:inline-block;touch-action:none;user-select:none;cursor:crosshair;background:var(--ctl-surface,#1f2226);border:1px solid var(--ctl-track,#3a4048);border-radius:6px;}
:host([disabled]){opacity:.4;cursor:not-allowed;}
canvas{display:block;width:100%;height:100%;}`;
            this.#canvas = document.createElement('canvas');
            root.append(style, this.#canvas);
        }
        this.#requestRender();
    }
    attributeChangedCallback(name, old, val) {
        if (name === 'value-x' && val !== null)
            this.#x = this.#clamp('x', Number(val));
        if (name === 'value-y' && val !== null)
            this.#y = this.#clamp('y', Number(val));
        if (name === 'label')
            syncLabelAria(this, old ?? val);
        this.#syncAria();
        this.#requestRender();
    }
    get x() {
        return this.#x ?? this.#clamp('x', this.#num('value-x', this.#center('x')));
    }
    set x(v) {
        this.#set(v, this.y);
    }
    get y() {
        return this.#y ?? this.#clamp('y', this.#num('value-y', this.#center('y')));
    }
    set y(v) {
        this.#set(this.x, v);
    }
    get disabled() {
        return this.hasAttribute('disabled');
    }
    set disabled(v) {
        this.toggleAttribute('disabled', v);
    }
    #min(axis) {
        return this.#num(`min-${axis}`, 0);
    }
    #max(axis) {
        return this.#num(`max-${axis}`, 1);
    }
    #range(axis) {
        return this.#max(axis) - this.#min(axis);
    }
    #center(axis) {
        return (this.#min(axis) + this.#max(axis)) / 2;
    }
    #pointTo(clientX, clientY) {
        const rect = this.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0)
            return;
        const fx = (clientX - rect.left) / rect.width;
        const fy = 1 - (clientY - rect.top) / rect.height; // bas = min
        this.#set(this.#min('x') + fx * this.#range('x'), this.#min('y') + fy * this.#range('y'));
        this.#emit('input');
    }
    #set(x, y) {
        this.#x = this.#clamp('x', x);
        this.#y = this.#clamp('y', y);
        this.#syncAria();
        this.#requestRender();
    }
    #clamp(axis, v) {
        return Math.min(this.#max(axis), Math.max(this.#min(axis), v));
    }
    #num(attr, fallback) {
        const raw = this.getAttribute(attr);
        if (raw === null)
            return fallback;
        const n = Number(raw);
        return Number.isNaN(n) ? fallback : n;
    }
    #syncAria() {
        this.setAttribute('aria-valuetext', `x: ${this.x.toFixed(2)}, y: ${this.y.toFixed(2)}`);
    }
    #emit(type) {
        this.dispatchEvent(new CustomEvent(type, { detail: { x: this.x, y: this.y }, bubbles: true }));
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
        const accent = getComputedStyle(this).getPropertyValue('--ctl-accent').trim() || '#19c2ff';
        const track = getComputedStyle(this).getPropertyValue('--ctl-track').trim() || '#3a4048';
        // grille
        ctx.strokeStyle = track;
        ctx.lineWidth = 1;
        for (const f of [0.25, 0.5, 0.75]) {
            ctx.beginPath();
            ctx.moveTo(f * w, 0);
            ctx.lineTo(f * w, h);
            ctx.moveTo(0, f * h);
            ctx.lineTo(w, f * h);
            ctx.stroke();
        }
        // croix + point
        const px = ((this.x - this.#min('x')) / (this.#range('x') || 1)) * w;
        const py = h - ((this.y - this.#min('y')) / (this.#range('y') || 1)) * h;
        ctx.strokeStyle = accent;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}
