# 🎛️ potard

> **Contrôles audio style Ableton/Traktor en Web Components.**
> Knobs, faders, sliders, crossfader, surfaces XY, switches, VU-mètres, groupes à somme constante — rendu Canvas, zéro dépendance, accessibles au clavier.

*« Potard » : c'est comme ça que les sondiers et les DJs appellent un potentiomètre.* 🇫🇷

**🕹️ Démo interactive : [yrbane.github.io/potard](https://yrbane.github.io/potard/)** — tous les contrôles manipulables en live, avec snippets et journal d'événements.

Ce sont des Custom Elements natifs : ils fonctionnent dans n'importe quelle page HTML ou framework (React, Svelte, Vue…).

## Installation

```bash
npm install potard          # (bientôt sur npm)
# ou en dépendance git :
npm install github:yrbane/potard
```

```ts
import { defineControls } from 'potard';
defineControls(); // enregistre tous les éléments (idempotent)
```

```html
<pt-knob min="-12" max="12" value="0" default="0" label="HI" unit="dB"></pt-knob>
<pt-fader min="0" max="1" value="0.8" label="Volume" curve="log"></pt-fader>
<pt-slider min="-12" max="12" value="3" default="0" label="Gain" unit="dB"></pt-slider>
<pt-crossfader label="X-Fade"></pt-crossfader>
<pt-xy label="Filter" min-x="20" max-x="20000" min-y="0" max-y="1"></pt-xy>
<pt-switch label="Sync" checked></pt-switch>
<pt-stepper options="lin,log,exp" value="log" label="Curve"></pt-stepper>
<pt-vumeter segments="16"></pt-vumeter>
<pt-led on color="#3ddc84"></pt-led>
<pt-button toggle>KILL</pt-button>
```

## Composants

| Élément | Rôle | Spécificités |
|---|---|---|
| `<pt-knob>` | Potentiomètre rotatif (anneau de valeur, bipolaire si `min < 0 < max`) | drag vertical |
| `<pt-fader>` | Fader vertical | drag vertical |
| `<pt-slider>` | Slider à curseur en flèche, portion parcourue allumée (bipolaire depuis zéro si `min < 0 < max`) | `orientation="h|v"` (h par défaut), `color` |
| `<pt-mix>` | Groupe de sliders liés à somme constante (budget, points, %) | `total`, `mode="prop|equal|cascade"`, `step` (somme exacte), enfants `<pt-mix-track>` |
| `<pt-crossfader>` | Crossfader horizontal, centré par défaut (−1 … 1) | drag horizontal |
| `<pt-xy>` | Surface XY (façon Kaoss pad) : deux axes indépendants | positionnement absolu au pointeur ; attrs `min-x max-x value-x default-x` (idem `-y`) ; events `{ x, y }` |
| `<pt-switch>` | Interrupteur on/off (activator Ableton) | `checked`, `role="switch"`, Espace/Entrée |
| `<pt-stepper>` | Sélecteur cranté ‹ › avec bouclage | `options="a,b,c"`, `value`, flèches/molette, `next()`/`prev()` |
| `<pt-vumeter>` | VU-mètre à segments avec mémoire de pic | propriétés `level` (0…1), `peak`, `resetPeak()` ; attrs `segments`, `orientation="v|h"` |
| `<pt-led>` | LED de statut (décorative, `aria-hidden`) | attrs `on`, `color`, `blink` ; propriété `on` |
| `<pt-button>` | Bouton momentané (`press`) ou verrouillé (`toggle` → `change`) | propriété `active` |

## Attributs communs (contrôles continus)

| Attribut | Rôle | Défaut |
|---|---|---|
| `min` / `max` | Bornes de la valeur | `0` / `1` (crossfader : `−1`/`1`) |
| `value` | Valeur initiale | milieu de la plage |
| `default` | Valeur de retour au double-clic | milieu de la plage |
| `step` | Pas clavier/molette | 1 % de la course |
| `label` | Libellé affiché sous le contrôle **et** `aria-label` par défaut | — |
| `unit` | Unité exposée en `aria-valuetext` (« 6 dB ») | — |
| `disabled` | Désactive toute interaction (`aria-disabled`, opacité) | — |
| `sensitivity` | Pixels de drag pour la pleine course | `200` |
| `curve` | Réponse du geste : `lin` ou `log` (taper audio, valeur = position²) | `lin` |

`label` et `disabled` existent aussi sur `pt-switch`, `pt-xy`, `pt-stepper` et `pt-mix`.

## Répartition à somme constante : `<pt-mix>`

Des sliders liés qui se partagent un `total` : quand l'un monte, les autres compensent.
Idéal pour répartir un budget, des points de compétence ou un pourcentage.

```html
<pt-mix total="10" unit="€" step="0.5" mode="prop" label="Budget">
  <pt-mix-track label="Courses" description="Alimentation" value="4" color="#3ddc84"></pt-mix-track>
  <pt-mix-track label="Loisirs" value="3" color="#ff8a1e"></pt-mix-track>
  <pt-mix-track label="Épargne" value="3" locked></pt-mix-track>
</pt-mix>
```

Attributs de `<pt-mix>` :

| Attribut | Rôle | Défaut |
|---|---|---|
| `total` | Somme constante à répartir | `100` |
| `mode` | Compensation : `prop` (prorata), `equal` (parts égales), `cascade` (piste suivante d'abord) | `prop` |
| `step` | Granularité — la somme reste **exacte** (le reste d'arrondi est absorbé) ; continu si absent | — |
| `unit` | Unité affichée par piste et exposée en `aria-valuetext` | — |
| `orientation` | `h` : lignes empilées · `v` : colonnes | `h` |
| `label` / `disabled` | Libellé du groupe (`role="group"`) / désactivation globale | — |

Attributs de `<pt-mix-track>` (par piste) : `label`, `description` (sous-libellé), `value`
(valeur initiale, normalisée pour atteindre le total), `color` (teinte du remplissage et de
la flèche), `locked` (valeur intouchable, exclue de la compensation — cadenas cliquable).

Comportement : les valeurs initiales sont **normalisées** vers `total` (pistes sans `value` :
partage égal du restant) ; **double-clic** sur une piste = répartition égale du disponible ;
la propriété `track.value = x` déclenche la compensation comme un geste utilisateur.

```ts
mix.addEventListener('input', (e) => {
  const { values, labels, index } = (e as CustomEvent).detail;
});
```

La logique pure est aussi exportée : `normalize`, `adjust`, `equalize` (types `MixMode`, `MixConstraints`).

## Interactions (héritées d'Ableton/Traktor)

- **Drag vertical** (horizontal pour le crossfader, absolu pour la surface XY) : `sensitivity` px = pleine course.
- **Shift** pendant le drag : précision ×10.
- **Double-clic** : retour à la valeur `default`.
- **Molette** : incréments de `step`.
- **Clavier** : flèches (±`step`), `Home`/`End` (min/max) — `role="slider"`, `aria-valuenow`/`aria-valuetext` synchronisés.

## Événements

Les contrôles continus émettent des `CustomEvent` (bubbles) :

- `input` — en continu pendant le geste ;
- `change` — au relâchement (et après double-clic, molette, clavier).

`detail` est la valeur (`number`), `{ x, y }` pour `pt-xy`, `boolean` pour `pt-switch`, l'option (`string`) pour `pt-stepper`, `{ values, labels, index }` pour `pt-mix`.

```ts
knob.addEventListener('input', (e) => console.log((e as CustomEvent<number>).detail));
```

## Theming

Via CSS custom properties héritées — dimensionnez l'hôte comme n'importe quel élément :

```css
pt-knob   { width: 48px; height: 56px; --ctl-accent: #19c2ff; --ctl-track: #3a4048; }
pt-fader  { width: 36px; height: 160px; --ctl-accent: #ff8a1e; }
pt-slider { width: 160px; height: 36px; --ctl-accent: #19c2ff; }
pt-xy     { width: 160px; height: 160px; --ctl-surface: #1f2226; }
pt-led    { --led-color: #3ddc84; }
pt-button.active { background: var(--ctl-accent); }
```

## Utilitaire : courbes de crossfade

```ts
import { crossfadeGains } from 'potard';
crossfadeGains(0, 'constant-power');  // { a: 0.707, b: 0.707 } — équi-puissance
crossfadeGains(0, 'sharp');           // { a: 1, b: 1 }        — cut DJ
```

## Performance

Rendu **Canvas 2D dans le shadow DOM** : aucun layout/reflow pendant le drag, redraw uniquement sur changement via `requestAnimationFrame`, `devicePixelRatio` géré.

## Développement

```bash
pnpm install
pnpm test        # Vitest + happy-dom (TDD)
pnpm build       # tsc → dist/ (ESM + déclarations)
pnpm demo        # démo interactive (Vite)
```

## Licence

MIT
