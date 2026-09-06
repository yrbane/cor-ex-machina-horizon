/** Applique l'attribut label comme aria-label par défaut (sans écraser un aria-label explicite). */
export function syncLabelAria(el, previousLabel) {
    const label = el.getAttribute('label');
    if (!label)
        return;
    const current = el.getAttribute('aria-label');
    if (current === null || current === previousLabel)
        el.setAttribute('aria-label', label);
}
