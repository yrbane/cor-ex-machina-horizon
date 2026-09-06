import { syncLabelAria } from './labels.js';
/**
 * Interrupteur on/off style Ableton (activator). Attributs : `checked`,
 * `label`, `disabled`. Événement `change` (detail: boolean).
 */
export class PtSwitch extends HTMLElement {
    static observedAttributes = ['checked', 'label', 'disabled'];
    constructor() {
        super();
        this.addEventListener('click', () => this.#toggle());
        this.addEventListener('keydown', (e) => {
            const ke = e;
            if (ke.key !== ' ' && ke.key !== 'Enter')
                return;
            e.preventDefault();
            this.#toggle();
        });
    }
    connectedCallback() {
        this.setAttribute('role', 'switch');
        if (!this.hasAttribute('tabindex'))
            this.tabIndex = 0;
        this.#syncAria();
        syncLabelAria(this);
        if (!this.shadowRoot) {
            const root = this.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = `:host{display:inline-flex;align-items:center;user-select:none;cursor:pointer;}
:host([disabled]){opacity:.4;cursor:not-allowed;}
.track{width:28px;height:14px;border-radius:7px;background:var(--ctl-track,#3a4048);position:relative;transition:background .15s;}
:host([checked]) .track{background:var(--ctl-accent,#19c2ff);}
.thumb{position:absolute;top:2px;left:2px;width:10px;height:10px;border-radius:50%;background:#d7dce2;transition:left .15s;}
:host([checked]) .thumb{left:16px;background:#101318;}`;
            const track = document.createElement('span');
            track.className = 'track';
            const thumb = document.createElement('span');
            thumb.className = 'thumb';
            track.appendChild(thumb);
            root.append(style, track);
        }
    }
    attributeChangedCallback(name, old, val) {
        if (name === 'checked')
            this.#syncAria();
        if (name === 'label')
            syncLabelAria(this, old ?? val);
    }
    get checked() {
        return this.hasAttribute('checked');
    }
    set checked(v) {
        this.toggleAttribute('checked', v);
    }
    get disabled() {
        return this.hasAttribute('disabled');
    }
    set disabled(v) {
        this.toggleAttribute('disabled', v);
    }
    #toggle() {
        if (this.disabled)
            return;
        this.checked = !this.checked;
        this.dispatchEvent(new CustomEvent('change', { detail: this.checked, bubbles: true }));
    }
    #syncAria() {
        this.setAttribute('aria-checked', String(this.checked));
    }
}
