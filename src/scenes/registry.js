import { TYPES, WATER_TYPES } from '../events.js';

// Registre des scènes : même moteur, compositions différentes
export const SCENES = [
  { id: 'horizon', name: 'Horizon', water: true, blurb: 'montagnes au bord de l’eau, reflets et voiliers' },
  { id: 'valley', name: 'Vallée', water: false, blurb: 'vallée de montagne, biomes verdoyants, désertiques ou enneigés' },
];
export const sceneById = id => SCENES.find(s => s.id === id) || SCENES[0];
export const nextSceneId = id => { const i = SCENES.findIndex(s => s.id === id); return SCENES[(i + 1) % SCENES.length].id; };
// Types de passages admis dans une scène : sans eau, pas de bateau ni de baleine
export const allowedTypes = id => Object.keys(TYPES).filter(t => sceneById(id).water || !WATER_TYPES.includes(t));
