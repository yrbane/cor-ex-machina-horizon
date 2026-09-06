/**
 * LED de statut, purement décorative. Attributs : `on`, `color`, `blink`.
 * Propriété `on` (boolean, reflétée dans l'attribut).
 */
export class PtLed extends HTMLElement {
    static observedAttributes = ['on', 'color', 'blink'];
    connectedCallback() {
        this.setAttribute('aria-hidden', 'true');
        if (!this.shadowRoot) {
            const root = this.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = `:host{display:inline-block;width:8px;height:8px;}
.dot{width:100%;height:100%;border-radius:50%;background:var(--ctl-track,#3a4048);transition:background .1s,box-shadow .1s;}
:host([on]) .dot{background:var(--led-color,var(--ctl-accent,#19c2ff));box-shadow:0 0 6px var(--led-color,var(--ctl-accent,#19c2ff));}
:host([on][blink]) .dot{animation:pt-led-blink .5s step-start infinite;}
@keyframes pt-led-blink{50%{opacity:.2;}}`;
            const dot = document.createElement('span');
            dot.className = 'dot';
            root.append(style, dot);
        }
        this.#syncColor();
    }
    attributeChangedCallback(name) {
        if (name === 'color')
            this.#syncColor();
    }
    get on() {
        return this.hasAttribute('on');
    }
    set on(v) {
        this.toggleAttribute('on', v);
    }
    #syncColor() {
        const color = this.getAttribute('color');
        if (color)
            this.style.setProperty('--led-color', color);
    }
}
