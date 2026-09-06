import { TYPES } from '../events.js';

// Registre des scènes : même moteur, compositions différentes. Chaque scène admet des catégories de passages.
export const SCENES = [
  { id: 'horizon', name: 'Horizon', water: true, cats: ['sky', 'water'], blurb: 'montagnes au bord de l’eau, reflets et voiliers' },
  { id: 'valley', name: 'Vallée', water: false, cats: ['sky'], blurb: 'vallée de montagne, biomes verdoyants, désertiques ou enneigés' },
  { id: 'city', name: 'Ville', water: false, cats: ['sky', 'city'], blurb: 'rues d’immeubles, moderne, vieille ville ou néons, trafic et passants' },
  { id: 'sea', name: 'Océan', water: false, cats: ['sea'], blurb: 'fond des océans, récif, forêt de kelp ou abysses, bancs de poissons et requins' },
];
export const sceneById = id => SCENES.find(s => s.id === id) || SCENES[0];
export const nextSceneId = id => { const i = SCENES.findIndex(s => s.id === id); return SCENES[(i + 1) % SCENES.length].id; };
// Types de passages admis dans une scène, selon leur catégorie (sky par défaut)
export const allowedTypes = id => { const cats = sceneById(id).cats; return Object.keys(TYPES).filter(t => cats.includes(TYPES[t].where || 'sky')); };
